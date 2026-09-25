"use client";

import { useRef } from "react";

export function GroupSwitcher({
  groups,
  activeId,
  action,
}: {
  groups: { id: string; name: string }[];
  activeId: string;
  action: (fd: FormData) => void | Promise<void>;
}) {
  const ref = useRef<HTMLFormElement>(null);
  if (groups.length <= 1) return <span className="text-slate-500 hidden sm:inline">{groups[0]?.name}</span>;
  return (
    <form action={action} ref={ref}>
      <select
        name="groupId"
        defaultValue={activeId}
        onChange={() => ref.current?.requestSubmit()}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        title="Switch problem group"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </form>
  );
}
