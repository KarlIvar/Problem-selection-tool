"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { DEFAULT_FORMATTING, DEFAULT_PROBLEM_TEMPLATE, DEFAULT_SOLUTION_TEMPLATE } from "@/lib/constants";
import { str } from "@/lib/util";
import type { ActionState } from "./auth";

async function ownContest(id: string, groupId: string) {
  const c = await prisma.contest.findFirst({ where: { id, groupId } });
  if (!c) throw new Error("Contest not found");
  return c;
}

export async function createContest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, group, isAdmin } = await requireContext();
  if (!isAdmin) return { error: "Only admins can add contests" };
  const name = str(fd, "name").trim();
  const numProblems = parseInt(str(fd, "numProblems"), 10);
  if (!name) return { error: "Name is required" };
  if (!Number.isFinite(numProblems) || numProblems < 1 || numProblems > 60) return { error: "Number of problems must be between 1 and 60" };
  const max = await prisma.contest.aggregate({ where: { groupId: group.id }, _max: { position: true } });
  await prisma.contest.create({
    data: {
      groupId: group.id,
      name,
      numProblems,
      position: (max._max.position ?? -1) + 1,
      formatting: DEFAULT_FORMATTING,
      problemTemplate: DEFAULT_PROBLEM_TEMPLATE,
      solutionTemplate: DEFAULT_SOLUTION_TEMPLATE,
      comments: { create: { authorId: user.id, isEvent: true, body: "created the paper" } },
    },
  });
  revalidatePath("/group");
  revalidatePath("/papers");
  return {};
}

export async function updateContest(fd: FormData) {
  const { user, group, isAdmin } = await requireContext();
  if (!isAdmin) return;
  const id = str(fd, "id");
  const c = await ownContest(id, group.id);
  const name = str(fd, "name").trim() || c.name;
  const numProblems = parseInt(str(fd, "numProblems"), 10);
  const n = Number.isFinite(numProblems) && numProblems >= 1 && numProblems <= 60 ? numProblems : c.numProblems;
  const changes: string[] = [];
  if (name !== c.name) changes.push(`renamed the paper from “${c.name}” to “${name}”`);
  if (n !== c.numProblems) changes.push(`changed the number of problems from ${c.numProblems} to ${n}`);
  await prisma.contest.update({
    where: { id },
    data: { name, numProblems: n, comments: changes.length ? { create: { authorId: user.id, isEvent: true, body: changes.join("; ") } } : undefined },
  });
  revalidatePath("/group");
  revalidatePath("/papers");
  revalidatePath(`/papers/${id}`);
}

export async function moveContest(fd: FormData) {
  const { group, isAdmin } = await requireContext();
  if (!isAdmin) return;
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const all = await prisma.contest.findMany({ where: { groupId: group.id }, orderBy: { position: "asc" } });
  const idx = all.findIndex((c) => c.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= all.length) return;
  const reordered = [...all];
  [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
  await prisma.$transaction(reordered.map((c, i) => prisma.contest.update({ where: { id: c.id }, data: { position: i } })));
  revalidatePath("/group");
  revalidatePath("/papers");
}

export async function deleteContest(fd: FormData) {
  const { group, isAdmin } = await requireContext();
  if (!isAdmin) return;
  const id = str(fd, "id");
  await ownContest(id, group.id);
  await prisma.contest.delete({ where: { id } });
  revalidatePath("/group");
  revalidatePath("/papers");
  redirect("/papers");
}

export async function updateFormatting(contestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, group } = await requireContext();
  const c = await ownContest(contestId, group.id);
  const formatting = str(fd, "formatting");
  const problemTemplate = str(fd, "problemTemplate");
  const solutionTemplate = str(fd, "solutionTemplate");
  const changes: string[] = [];
  if (formatting !== c.formatting) changes.push("paper formatting");
  if (problemTemplate !== c.problemTemplate) changes.push("problem template");
  if (solutionTemplate !== c.solutionTemplate) changes.push("solution template");
  if (!changes.length) return { error: "Nothing changed" };
  await prisma.contest.update({
    where: { id: contestId },
    data: { formatting, problemTemplate, solutionTemplate, comments: { create: { authorId: user.id, isEvent: true, body: `edited the ${changes.join(", ")}` } } },
  });
  revalidatePath(`/papers/${contestId}`);
  revalidatePath(`/papers/${contestId}/formatting`);
  return {};
}

export async function uploadContestImage(contestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, group } = await requireContext();
  await ownContest(contestId, group.id);
  const file = fd.get("image") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file first" };
  if (file.size > 10 * 1024 * 1024) return { error: "Image is too large (max 10 MB)" };
  const filename = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const buf = Buffer.from(await file.arrayBuffer());
  const existing = await prisma.image.findFirst({ where: { contestId, filename } });
  if (existing) {
    await prisma.image.update({ where: { id: existing.id }, data: { data: buf, size: buf.length, mimeType: file.type, uploadedById: user.id } });
  } else {
    await prisma.image.create({ data: { groupId: group.id, contestId, uploadedById: user.id, filename, mimeType: file.type || "application/octet-stream", data: buf, size: buf.length } });
  }
  await prisma.comment.create({ data: { contestId, authorId: user.id, isEvent: true, body: `${existing ? "replaced" : "uploaded"} the image ${filename}` } });
  revalidatePath(`/papers/${contestId}/formatting`);
  revalidatePath(`/papers/${contestId}`);
  return {};
}

export async function deleteContestImage(fd: FormData) {
  const { user, group } = await requireContext();
  const id = str(fd, "id");
  const img = await prisma.image.findFirst({ where: { id, groupId: group.id, contestId: { not: null } } });
  if (!img) return;
  await prisma.image.delete({ where: { id } });
  await prisma.comment.create({ data: { contestId: img.contestId, authorId: user.id, isEvent: true, body: `removed the image ${img.filename}` } });
  revalidatePath(`/papers/${img.contestId}/formatting`);
  revalidatePath(`/papers/${img.contestId}`);
}

export async function addContestComment(fd: FormData) {
  const { user, group } = await requireContext();
  const contestId = str(fd, "contestId");
  const body = str(fd, "body").trim();
  const isSpoiler = str(fd, "isSpoiler") === "on";
  await ownContest(contestId, group.id);
  if (!body) return;
  await prisma.comment.create({ data: { contestId, authorId: user.id, body, isSpoiler } });
  revalidatePath(`/papers/${contestId}`);
}
