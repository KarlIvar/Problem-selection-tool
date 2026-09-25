"use client";

import { useState } from "react";

export function Spoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <div className={shown ? "" : "spoiler-hidden"} aria-hidden={!shown}>
        {children}
      </div>
      {!shown && (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700 cursor-pointer"
        >
          <span className="rounded bg-white/90 border border-slate-300 px-2 py-1 shadow-sm">Spoiler — click to reveal</span>
        </button>
      )}
    </div>
  );
}
