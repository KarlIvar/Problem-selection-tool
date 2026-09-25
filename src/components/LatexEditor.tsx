"use client";

import { useMemo, useState } from "react";
import { renderLatex } from "@/lib/latex";

export function LatexEditor({
  name,
  label,
  defaultValue = "",
  rows = 8,
  required = false,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(true);
  const html = useMemo(() => (preview ? renderLatex(value) : ""), [value, preview]);
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        <button type="button" onClick={() => setPreview((p) => !p)} className="text-xs text-indigo-600 hover:underline cursor-pointer">
          {preview ? "Hide preview" : "Show preview"}
        </button>
      </div>
      <div className={`grid gap-3 ${preview ? "md:grid-cols-2" : ""}`}>
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          required={required}
          placeholder={placeholder}
          className="input mono"
          spellCheck={false}
        />
        {preview && (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm overflow-auto min-h-[6rem]">
            {value.trim() ? <div className="latex leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} /> : <span className="text-slate-400">Preview</span>}
          </div>
        )}
      </div>
    </div>
  );
}
