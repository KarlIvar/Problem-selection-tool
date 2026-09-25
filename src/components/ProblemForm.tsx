"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SUBFIELDS } from "@/lib/constants";
import { LatexEditor } from "./LatexEditor";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/actions/auth";

export type ProblemFormValues = {
  name: string;
  statement: string;
  solution: string;
  subfield: string;
  authorId: string;
  imageId: string | null;
};

export function ProblemForm({
  action,
  initial,
  members,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: ProblemFormValues;
  members: { id: string; name: string }[];
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="label">Name</label>
          <input name="name" defaultValue={initial.name} required className="input" placeholder="Short, memorable name" />
        </div>
        <div>
          <label className="label">Subfield</label>
          <select name="subfield" defaultValue={initial.subfield} className="input">
            {SUBFIELDS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Author</label>
          <select name="authorId" defaultValue={initial.authorId} className="input">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <LatexEditor name="statement" label="Problem statement (LaTeX, English)" defaultValue={initial.statement} rows={10} required placeholder="Let $n$ be a positive integer. Prove that…" />
      <LatexEditor name="solution" label="Solution (LaTeX, English)" defaultValue={initial.solution} rows={14} placeholder="We claim that…" />
      <div>
        <label className="label">Image (optional)</label>
        {initial.imageId && (
          <div className="mb-2 flex items-center gap-3">
            <img src={`/api/images/${initial.imageId}`} alt="" className="max-h-40 rounded border border-slate-200" />
            <label className="text-sm flex items-center gap-1.5">
              <input type="checkbox" name="removeImage" value="1" /> Remove image
            </label>
          </div>
        )}
        <input type="file" name="image" accept="image/*" className="text-sm" />
        <p className="text-xs text-slate-500 mt-1">Shown below the statement. Max 10 MB. Uploading a new file replaces the current image.</p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
