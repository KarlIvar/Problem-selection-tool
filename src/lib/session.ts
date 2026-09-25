import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "./db";

const COOKIE = "pst_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "insecure-dev-secret");

export type SessionPayload = { userId: string; groupId: string | null };

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: String(payload.userId), groupId: (payload.groupId as string | null) ?? null };
  } catch {
    return null;
  }
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  groups: { id: string; name: string; role: string }[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await readSession();
  if (!s) return null;
  const user = await prisma.user.findUnique({
    where: { id: s.userId },
    include: { memberships: { include: { group: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    groups: user.memberships.map((m) => ({ id: m.group.id, name: m.group.name, role: m.role })),
  };
}

/**
 * Returns the logged-in user together with the active group.
 * Redirects to /login when not logged in, and to /groups when no group is active.
 * All data access in the app must be scoped to `group.id`.
 */
export async function requireContext() {
  const s = await readSession();
  if (!s) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const group = user.groups.find((g) => g.id === s.groupId) ?? user.groups[0] ?? null;
  if (!group) redirect("/groups");
  return { user, group, isAdmin: group.role === "ADMIN" };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
