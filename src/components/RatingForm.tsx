"use client";

import { useRef, useTransition } from "react";

export function RatingSelect({
  problemId,
  contestId,
  numProblems,
  current,
  action,
}: {
  problemId: string;
  contestId: string;
  numProblems: number;
  current: { kind: string; number: number | null } | null;
  action: (fd: FormData) => void | Promise<void>;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const value = !current ? "NONE" : current.kind === "NUMBER" ? String(current.number) : current.kind;
  return (
    <form action={(fd) => start(() => action(fd))} ref={ref} className="inline-flex items-center gap-2">
      <input type="hidden" name="problemId" value={problemId} />
      <input type="hidden" name="contestId" value={contestId} />
      <select
        key={value}
        name="value"
        defaultValue={value}
        onChange={() => ref.current?.requestSubmit()}
        disabled={pending}
        className={`rounded-md border px-2 py-1 text-sm bg-white ${value === "NONE" ? "border-slate-300 text-slate-500" : "border-indigo-300 text-indigo-800 font-medium"}`}
      >
        <option value="NONE">— not rated —</option>
        {Array.from({ length: numProblems }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            Problem {n}
          </option>
        ))}
        <option value="TOO_EASY">Too easy for this paper</option>
        <option value="TOO_HARD">Too hard for this paper</option>
        <option value="UNKNOWN">Don't know</option>
      </select>
    </form>
  );
}
