"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { SUBFIELDS, RATING_KINDS } from "@/lib/constants";
import { str } from "@/lib/util";
import type { ActionState } from "./auth";

const MAX_IMAGE = 10 * 1024 * 1024;

async function storeImage(file: File | null, groupId: string, userId: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_IMAGE) throw new Error("Image is too large (max 10 MB)");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed");
  const buf = Buffer.from(await file.arrayBuffer());
  const img = await prisma.image.create({
    data: { groupId, uploadedById: userId, filename: file.name, mimeType: file.type, data: buf, size: buf.length },
  });
  return img.id;
}

const problemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  statement: z.string().trim().min(1, "Statement is required"),
  solution: z.string(),
  subfield: z.enum(SUBFIELDS.map((s) => s.value) as [string, ...string[]]),
  authorId: z.string().optional(),
});

async function ownProblem(id: string, groupId: string) {
  const p = await prisma.problem.findFirst({ where: { id, groupId } });
  if (!p) throw new Error("Problem not found");
  return p;
}

export async function createProblem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, group } = await requireContext();
  const parsed = problemSchema.safeParse({
    name: str(fd, "name"),
    statement: str(fd, "statement"),
    solution: str(fd, "solution"),
    subfield: str(fd, "subfield"),
    authorId: str(fd, "authorId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const authorId = d.authorId && (await prisma.membership.findUnique({ where: { userId_groupId: { userId: d.authorId, groupId: group.id } } })) ? d.authorId : user.id;
  let imageId: string | null = null;
  try {
    imageId = await storeImage(fd.get("image") as File | null, group.id, user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const problem = await prisma.problem.create({
    data: {
      groupId: group.id,
      name: d.name,
      statement: d.statement,
      solution: d.solution,
      subfield: d.subfield,
      authorId,
      createdById: user.id,
      imageId,
      comments: { create: { authorId: user.id, body: "created the problem", isEvent: true } },
    },
  });
  redirect(`/problems/${problem.id}`);
}

export async function updateProblem(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, group } = await requireContext();
  const existing = await ownProblem(id, group.id);
  const parsed = problemSchema.safeParse({
    name: str(fd, "name"),
    statement: str(fd, "statement"),
    solution: str(fd, "solution"),
    subfield: str(fd, "subfield"),
    authorId: str(fd, "authorId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const authorId = d.authorId && (await prisma.membership.findUnique({ where: { userId_groupId: { userId: d.authorId, groupId: group.id } } })) ? d.authorId : existing.authorId;

  const removeImage = str(fd, "removeImage") === "1";
  let imageId = existing.imageId;
  try {
    const newImage = await storeImage(fd.get("image") as File | null, group.id, user.id);
    if (newImage) imageId = newImage;
    else if (removeImage) imageId = null;
  } catch (e) {
    return { error: (e as Error).message };
  }

  const changes: string[] = [];
  if (existing.statement !== d.statement) changes.push("edited the problem statement");
  if (existing.solution !== d.solution) changes.push("edited the solution");
  if (existing.name !== d.name) changes.push(`renamed the problem from “${existing.name}” to “${d.name}”`);
  if (existing.subfield !== d.subfield) changes.push(`changed the subfield to ${SUBFIELDS.find((s) => s.value === d.subfield)?.label}`);
  if (existing.authorId !== authorId) changes.push("changed the author");
  if (existing.imageId !== imageId) changes.push(imageId ? "changed the image" : "removed the image");

  await prisma.problem.update({
    where: { id },
    data: {
      name: d.name,
      statement: d.statement,
      solution: d.solution,
      subfield: d.subfield,
      authorId,
      imageId,
      comments: changes.length ? { create: { authorId: user.id, body: changes.join("; "), isEvent: true } } : undefined,
    },
  });
  if (existing.imageId && existing.imageId !== imageId) {
    await prisma.image.delete({ where: { id: existing.imageId } }).catch(() => {});
  }
  revalidatePath(`/problems/${id}`);
  redirect(`/problems/${id}`);
}

export async function deleteProblem(fd: FormData) {
  const { user, group, isAdmin } = await requireContext();
  const id = str(fd, "id");
  const p = await ownProblem(id, group.id);
  if (!isAdmin && p.createdById !== user.id) throw new Error("Only admins or the creator can delete a problem");
  await prisma.problem.delete({ where: { id } });
  if (p.imageId) await prisma.image.delete({ where: { id: p.imageId } }).catch(() => {});
  redirect("/problems");
}

export async function saveTranslation(problemId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, group } = await requireContext();
  await ownProblem(problemId, group.id);
  const language = str(fd, "language").trim().toLowerCase();
  const statement = str(fd, "statement").trim();
  const solution = str(fd, "solution");
  if (!/^[a-z]{2,3}$/.test(language)) return { error: "Language must be a 2–3 letter code (e.g. sv)" };
  if (!statement) return { error: "Statement is required" };
  const existing = await prisma.translation.findUnique({ where: { problemId_language: { problemId, language } } });
  await prisma.translation.upsert({
    where: { problemId_language: { problemId, language } },
    update: { statement, solution, updatedById: user.id },
    create: { problemId, language, statement, solution, updatedById: user.id },
  });
  const label = language.toUpperCase();
  const what = existing
    ? [existing.statement !== statement ? "statement" : null, existing.solution !== solution ? "solution" : null].filter(Boolean).join(" and ")
    : null;
  if (!existing || what) {
    await prisma.comment.create({
      data: { problemId, authorId: user.id, isEvent: true, body: existing ? `updated the ${label} translation (${what})` : `added a ${label} translation` },
    });
  }
  revalidatePath(`/problems/${problemId}`);
  redirect(`/problems/${problemId}?lang=${language}`);
}

export async function deleteTranslation(fd: FormData) {
  const { user, group } = await requireContext();
  const problemId = str(fd, "problemId");
  const language = str(fd, "language");
  await ownProblem(problemId, group.id);
  await prisma.translation.delete({ where: { problemId_language: { problemId, language } } }).catch(() => {});
  await prisma.comment.create({ data: { problemId, authorId: user.id, isEvent: true, body: `removed the ${language.toUpperCase()} translation` } });
  revalidatePath(`/problems/${problemId}`);
  redirect(`/problems/${problemId}`);
}

export async function toggleSolved(fd: FormData) {
  const { user, group } = await requireContext();
  const problemId = str(fd, "problemId");
  await ownProblem(problemId, group.id);
  const key = { userId_problemId: { userId: user.id, problemId } };
  const existing = await prisma.solve.findUnique({ where: key });
  if (existing) await prisma.solve.delete({ where: key });
  else await prisma.solve.create({ data: { userId: user.id, problemId } });
  revalidatePath(`/problems/${problemId}`);
  revalidatePath("/problems");
}

export async function setRating(fd: FormData) {
  const { user, group } = await requireContext();
  const problemId = str(fd, "problemId");
  const contestId = str(fd, "contestId");
  const value = str(fd, "value"); // "", "NONE", "TOO_EASY", "TOO_HARD", "UNKNOWN", or a number
  await ownProblem(problemId, group.id);
  const contest = await prisma.contest.findFirst({ where: { id: contestId, groupId: group.id } });
  if (!contest) throw new Error("Contest not found");
  const key = { userId_problemId_contestId: { userId: user.id, problemId, contestId } };
  if (!value || value === "NONE") {
    await prisma.rating.deleteMany({ where: { userId: user.id, problemId, contestId } });
  } else if ((RATING_KINDS as readonly string[]).includes(value) && value !== "NUMBER") {
    await prisma.rating.upsert({ where: key, update: { kind: value, number: null }, create: { userId: user.id, problemId, contestId, kind: value } });
  } else {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1 || n > 99) throw new Error("Invalid rating");
    await prisma.rating.upsert({ where: key, update: { kind: "NUMBER", number: n }, create: { userId: user.id, problemId, contestId, kind: "NUMBER", number: n } });
  }
  revalidatePath(`/problems/${problemId}`);
  revalidatePath("/problems");
}

export async function addProblemComment(fd: FormData) {
  const { user, group } = await requireContext();
  const problemId = str(fd, "problemId");
  const body = str(fd, "body").trim();
  const isSpoiler = str(fd, "isSpoiler") === "on";
  await ownProblem(problemId, group.id);
  if (!body) return;
  await prisma.comment.create({ data: { problemId, authorId: user.id, body, isSpoiler } });
  revalidatePath(`/problems/${problemId}`);
}

export async function deleteComment(fd: FormData) {
  const { user, group, isAdmin } = await requireContext();
  const id = str(fd, "id");
  const c = await prisma.comment.findUnique({ where: { id }, include: { problem: true, contest: true } });
  if (!c) return;
  const gid = c.problem?.groupId ?? c.contest?.groupId;
  if (gid !== group.id) return;
  if (c.isEvent) return;
  if (!isAdmin && c.authorId !== user.id) return;
  await prisma.comment.delete({ where: { id } });
  if (c.problemId) revalidatePath(`/problems/${c.problemId}`);
  if (c.contestId) revalidatePath(`/papers/${c.contestId}`);
}
