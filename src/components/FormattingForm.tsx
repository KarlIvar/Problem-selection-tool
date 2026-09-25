"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/actions/auth";

export function FormattingForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: { formatting: string; problemTemplate: string; solutionTemplate: string };
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="card p-5 space-y-4">
      <div>
        <label className="label">Paper skeleton (LaTeX)</label>
        <textarea name="formatting" defaultValue={initial.formatting} rows={22} className="input mono" spellCheck={false} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Problem template (repeated per problem)</label>
          <textarea name="problemTemplate" defaultValue={initial.problemTemplate} rows={5} className="input mono" spellCheck={false} />
        </div>
        <div>
          <label className="label">Solution template (repeated per problem)</label>
          <textarea name="solutionTemplate" defaultValue={initial.solutionTemplate} rows={5} className="input mono" spellCheck={false} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-amber-700">{state.error}</p>}
      {state && !state.error && <p className="text-sm text-emerald-700">Saved.</p>}
      <SubmitButton>Save formatting</SubmitButton>
    </form>
  );
}

export function ImageUploadForm({ action }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-2">
      <input type="file" name="image" className="text-sm w-full" required />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <SubmitButton className="btn-secondary">Upload</SubmitButton>
    </form>
  );
}
