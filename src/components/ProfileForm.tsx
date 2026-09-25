"use client";

import { useActionState } from "react";
import { updateProfile } from "@/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Email</label>
        <div className="input bg-slate-50 text-slate-500">{email}</div>
      </div>
      <div>
        <label className="label">Display name</label>
        <input name="name" defaultValue={name} required className="input" />
      </div>
      <div>
        <label className="label">New password (leave empty to keep)</label>
        <input name="password" type="password" minLength={8} className="input" autoComplete="new-password" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state && !state.error && <p className="text-sm text-emerald-700">Saved.</p>}
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
