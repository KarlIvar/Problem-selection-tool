"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, readSession, requireUser } from "@/lib/session";
import { DEFAULT_CONTESTS, DEFAULT_FORMATTING, DEFAULT_PROBLEM_TEMPLATE, DEFAULT_SOLUTION_TEMPLATE } from "@/lib/constants";
import { randomCode, str } from "@/lib/util";

export type ActionState = { error?: string } | undefined;

async function seedContests(groupId: string) {
  await prisma.contest.createMany({
    data: DEFAULT_CONTESTS.map((c, i) => ({
      groupId,
      name: c.name,
      position: i,
      numProblems: c.numProblems,
      formatting: DEFAULT_FORMATTING,
      problemTemplate: DEFAULT_PROBLEM_TEMPLATE,
      solutionTemplate: DEFAULT_SOLUTION_TEMPLATE,
    })),
  });
}

async function createGroupFor(userId: string, name: string) {
  const group = await prisma.group.create({
    data: { name, inviteCode: randomCode(), memberships: { create: { userId, role: "ADMIN" } } },
  });
  await seedContests(group.id);
  return group;
}

async function joinGroupFor(userId: string, inviteCode: string) {
  const group = await prisma.group.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
  if (!group) return null;
  await prisma.membership.upsert({
    where: { userId_groupId: { userId, groupId: group.id } },
    update: {},
    create: { userId, groupId: group.id, role: "MEMBER" },
  });
  return group;
}

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  mode: z.enum(["create", "join"]),
  groupName: z.string().trim().max(80).optional(),
  inviteCode: z.string().trim().max(40).optional(),
});

export async function register(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    password: str(fd, "password"),
    mode: str(fd, "mode"),
    groupName: str(fd, "groupName"),
    inviteCode: str(fd, "inviteCode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.mode === "create" && !d.groupName) return { error: "Group name is required" };
  if (d.mode === "join") {
    const g = await prisma.group.findUnique({ where: { inviteCode: (d.inviteCode ?? "").toUpperCase() } });
    if (!g) return { error: "Unknown invite code" };
  }
  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return { error: "An account with that email already exists" };

  const user = await prisma.user.create({
    data: { name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 10) },
  });
  const group = d.mode === "create" ? await createGroupFor(user.id, d.groupName!) : await joinGroupFor(user.id, d.inviteCode!);
  await createSession({ userId: user.id, groupId: group?.id ?? null });
  redirect("/problems");
}

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").trim().toLowerCase();
  const password = str(fd, "password");
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Wrong email or password" };
  await createSession({ userId: user.id, groupId: user.memberships[0]?.groupId ?? null });
  redirect("/problems");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function switchGroup(fd: FormData) {
  const user = await requireUser();
  const groupId = str(fd, "groupId");
  if (!user.groups.some((g) => g.id === groupId)) return;
  await createSession({ userId: user.id, groupId });
  redirect("/problems");
}

export async function createGroup(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = str(fd, "name").trim();
  if (!name) return { error: "Group name is required" };
  const group = await createGroupFor(user.id, name);
  await createSession({ userId: user.id, groupId: group.id });
  redirect("/problems");
}

export async function joinGroup(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const group = await joinGroupFor(user.id, str(fd, "inviteCode"));
  if (!group) return { error: "Unknown invite code" };
  await createSession({ userId: user.id, groupId: group.id });
  redirect("/problems");
}

export async function regenerateInviteCode() {
  const s = await readSession();
  if (!s?.groupId) return;
  const m = await prisma.membership.findUnique({ where: { userId_groupId: { userId: s.userId, groupId: s.groupId } } });
  if (m?.role !== "ADMIN") return;
  await prisma.group.update({ where: { id: s.groupId }, data: { inviteCode: randomCode() } });
}

export async function renameGroup(fd: FormData) {
  const s = await readSession();
  if (!s?.groupId) return;
  const m = await prisma.membership.findUnique({ where: { userId_groupId: { userId: s.userId, groupId: s.groupId } } });
  if (m?.role !== "ADMIN") return;
  const name = str(fd, "name").trim();
  if (!name) return;
  await prisma.group.update({ where: { id: s.groupId }, data: { name } });
}

export async function setMemberRole(fd: FormData) {
  const s = await readSession();
  if (!s?.groupId) return;
  const me = await prisma.membership.findUnique({ where: { userId_groupId: { userId: s.userId, groupId: s.groupId } } });
  if (me?.role !== "ADMIN") return;
  const userId = str(fd, "userId");
  const role = str(fd, "role") === "ADMIN" ? "ADMIN" : "MEMBER";
  if (userId === s.userId) return;
  await prisma.membership.update({ where: { userId_groupId: { userId, groupId: s.groupId } }, data: { role } });
}

export async function removeMember(fd: FormData) {
  const s = await readSession();
  if (!s?.groupId) return;
  const me = await prisma.membership.findUnique({ where: { userId_groupId: { userId: s.userId, groupId: s.groupId } } });
  if (me?.role !== "ADMIN") return;
  const userId = str(fd, "userId");
  if (userId === s.userId) return;
  await prisma.membership.delete({ where: { userId_groupId: { userId, groupId: s.groupId } } });
}

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = str(fd, "name").trim();
  if (!name) return { error: "Name is required" };
  const password = str(fd, "password");
  await prisma.user.update({
    where: { id: user.id },
    data: { name, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
  });
  return { error: undefined };
}
