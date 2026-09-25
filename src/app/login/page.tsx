"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);
  return (
    <AuthShell title="Log in">
      <form action={action} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" required className="input" autoComplete="current-password" />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton className="btn-primary w-full justify-center">Log in</SubmitButton>
        <p className="text-sm text-slate-600 text-center">
          No account? <Link href="/register" className="text-indigo-600 hover:underline">Register</Link>
        </p>
      </form>
    </AuthShell>
  );
}
