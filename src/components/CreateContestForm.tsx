"use client";

import { useActionState } from "react";
import { createContest } from "@/actions/contests";
import { SubmitButton } from "./SubmitButton";

export function CreateContestForm() {
  const [state, action] = useActionState(createContest, undefined);
  return (
    <form action={action} className="flex gap-2 items-end flex-wrap">
      <div className="grow">
        <label className="label">New contest</label>
        <input name="name" required className="input" placeholder="Contest name" />
      </div>
      <div>
        <label className="label">Problems</label>
        <input name="numProblems" type="number" min={1} max={60} defaultValue={6} className="input w-20" />
      </div>
      <SubmitButton className="btn-secondary">Add</SubmitButton>
      {state?.error && <p className="text-sm text-red-600 w-full">{state.error}</p>}
    </form>
  );
}
