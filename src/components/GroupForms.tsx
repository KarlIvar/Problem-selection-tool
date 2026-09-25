"use client";

import { useActionState } from "react";
import { createGroup, joinGroup } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function CreateGroupForm() {
  const [state, action] = useActionState(createGroup, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="label">Create a new group</label>
      <input name="name" required className="input" placeholder="Group name" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton className="btn-secondary">Create group</SubmitButton>
    </form>
  );
}

export function JoinGroupForm() {
  const [state, action] = useActionState(joinGroup, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="label">Join a group with an invite code</label>
      <input name="inviteCode" required className="input uppercase" placeholder="Invite code" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton className="btn-secondary">Join group</SubmitButton>
    </form>
  );
}
