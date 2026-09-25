"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { register } from "@/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";

export default function RegisterPage() {
  const [state, action] = useActionState(register, undefined);
  const [mode, setMode] = useState<"join" | "create">("join");
  return (
    <AuthShell title="Create an account">
      <form action={action} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <div className="rounded-md border border-slate-200 p-3 space-y-3">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="mode" value="join" checked={mode === "join"} onChange={() => setMode("join")} />
              Join a problem group
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="mode" value="create" checked={mode === "create"} onChange={() => setMode("create")} />
              Create a new group
            </label>
          </div>
          {mode === "join" ? (
            <div>
              <label className="label">Invite code</label>
              <input name="inviteCode" required className="input uppercase" placeholder="e.g. AB3K9XQ2ZT" />
              <p className="text-xs text-slate-500 mt-1">Ask an admin of your problem group for the code.</p>
            </div>
          ) : (
            <div>
              <label className="label">Group name</label>
              <input name="groupName" required className="input" placeholder="e.g. UVS Math Problem Group" />
              <p className="text-xs text-slate-500 mt-1">You become the admin of the new group.</p>
            </div>
          )}
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton className="btn-primary w-full justify-center">Register</SubmitButton>
        <p className="text-sm text-slate-600 text-center">
          Already registered? <Link href="/login" className="text-indigo-600 hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
