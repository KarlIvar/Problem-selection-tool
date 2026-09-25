"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { str } from "@/lib/util";

export type SlotInput = (string | null)[]; // problem id per position (index 0 = problem 1)

async function validateSlots(slots: SlotInput, groupId: string) {
  const ids = slots.filter((x): x is string => !!x);
  if (ids.length) {
    const count = await prisma.problem.count({ where: { id: { in: ids }, groupId } });
    if (count !== new Set(ids).size) throw new Error("Some problems do not belong to this group");
  }
  return slots.map((id, i) => ({ position: i + 1, problemId: id })).filter((s): s is { position: number; problemId: string } => !!s.problemId);
}

function describeDiff(before: Map<number, string>, after: Map<number, string>, names: Map<string, string>) {
  const parts: string[] = [];
  const positions = new Set([...before.keys(), ...after.keys()]);
  for (const pos of [...positions].sort((a, b) => a - b)) {
    const b = before.get(pos);
    const a = after.get(pos);
    if (b === a) continue;
    const nb = b ? `“${names.get(b) ?? b}”` : "empty";
    const na = a ? `“${names.get(a) ?? a}”` : "empty";
    parts.push(`#${pos}: ${nb} → ${na}`);
  }
  return parts;
}

export async function createDraft(contestId: string, name: string, slots: SlotInput) {
  const { user, group } = await requireContext();
  const contest = await prisma.contest.findFirst({ where: { id: contestId, groupId: group.id } });
  if (!contest) throw new Error("Contest not found");
  const data = await validateSlots(slots, group.id);
  const draftName = name.trim() || `Draft ${(await prisma.draft.count({ where: { contestId } })) + 1}`;
  const draft = await prisma.draft.create({
    data: { contestId, name: draftName, createdById: user.id, slots: { create: data } },
  });
  const names = new Map((await prisma.problem.findMany({ where: { id: { in: data.map((d) => d.problemId) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const list = data.map((d) => `#${d.position} “${names.get(d.problemId)}”`).join(", ");
  await prisma.comment.create({
    data: { contestId, authorId: user.id, isEvent: true, body: `created the draft “${draftName}”${list ? ` with ${list}` : " (empty)"}` },
  });
  revalidatePath(`/papers/${contestId}`);
  redirect(`/papers/${contestId}/drafts/${draft.id}`);
}

export async function saveDraft(draftId: string, name: string, slots: SlotInput) {
  const { user, group } = await requireContext();
  const draft = await prisma.draft.findFirst({ where: { id: draftId, contest: { groupId: group.id } }, include: { slots: true } });
  if (!draft) throw new Error("Draft not found");
  const data = await validateSlots(slots, group.id);
  const newName = name.trim() || draft.name;
  const before = new Map(draft.slots.map((s) => [s.position, s.problemId]));
  const after = new Map(data.map((s) => [s.position, s.problemId]));
  const allIds = [...new Set([...before.values(), ...after.values()])];
  const names = new Map((await prisma.problem.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const diff = describeDiff(before, after, names);
  if (newName !== draft.name) diff.unshift(`renamed from “${draft.name}” to “${newName}”`);

  await prisma.$transaction([
    prisma.draftProblem.deleteMany({ where: { draftId } }),
    prisma.draft.update({ where: { id: draftId }, data: { name: newName, slots: { create: data } } }),
  ]);
  if (diff.length) {
    await prisma.comment.create({ data: { contestId: draft.contestId, authorId: user.id, isEvent: true, body: `edited the draft “${newName}”: ${diff.join("; ")}` } });
  }
  revalidatePath(`/papers/${draft.contestId}`);
  revalidatePath(`/papers/${draft.contestId}/drafts/${draftId}`);
  return { ok: true };
}

export async function deleteDraft(fd: FormData) {
  const { user, group } = await requireContext();
  const draftId = str(fd, "draftId");
  const draft = await prisma.draft.findFirst({ where: { id: draftId, contest: { groupId: group.id } } });
  if (!draft) return;
  await prisma.draft.delete({ where: { id: draftId } });
  await prisma.comment.create({ data: { contestId: draft.contestId, authorId: user.id, isEvent: true, body: `deleted the draft “${draft.name}”` } });
  revalidatePath(`/papers/${draft.contestId}`);
  redirect(`/papers/${draft.contestId}`);
}

export async function duplicateDraft(fd: FormData) {
  const { user, group } = await requireContext();
  const draftId = str(fd, "draftId");
  const draft = await prisma.draft.findFirst({ where: { id: draftId, contest: { groupId: group.id } }, include: { slots: true } });
  if (!draft) return;
  const copy = await prisma.draft.create({
    data: { contestId: draft.contestId, name: `${draft.name} (copy)`, createdById: user.id, slots: { create: draft.slots.map((s) => ({ position: s.position, problemId: s.problemId })) } },
  });
  await prisma.comment.create({ data: { contestId: draft.contestId, authorId: user.id, isEvent: true, body: `duplicated the draft “${draft.name}” as “${copy.name}”` } });
  revalidatePath(`/papers/${draft.contestId}`);
  redirect(`/papers/${draft.contestId}/drafts/${copy.id}`);
}
