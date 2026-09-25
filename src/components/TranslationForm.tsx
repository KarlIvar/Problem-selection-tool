"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LANGUAGES } from "@/lib/constants";
import { LatexEditor } from "./LatexEditor";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/actions/auth";

export function TranslationForm({
  action,
  initial,
  lockLanguage,
  cancelHref,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: { language: string; statement: string; solution: string };
  lockLanguage: boolean;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div className="max-w-xs">
        <label className="label">Language</label>
        {lockLanguage ? (
          <>
            <input type="hidden" name="language" value={initial.language} />
            <div className="input bg-slate-50">{LANGUAGES.find((l) => l.code === initial.language)?.label ?? initial.language.toUpperCase()}</div>
          </>
        ) : (
          <input name="language" defaultValue={initial.language} list="langs" className="input" placeholder="sv" maxLength={3} />
        )}
        <datalist id="langs">
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </datalist>
      </div>
      <LatexEditor name="statement" label="Translated statement" defaultValue={initial.statement} rows={10} required />
      <LatexEditor name="solution" label="Translated solution" defaultValue={initial.solution} rows={12} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton>Save translation</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
