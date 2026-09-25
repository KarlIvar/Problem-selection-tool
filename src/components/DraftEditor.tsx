"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SUBFIELDS } from "@/lib/constants";
import { createDraft, saveDraft } from "@/actions/drafts";
import { SubfieldBadge } from "./SubfieldBadge";

export type PoolProblem = {
  id: string;
  name: string;
  subfield: string;
  author: string;
  solvedCount: number;
  solvedByMe: boolean;
  rating: string;
  median: number | null;
  tooEasy: number;
  tooHard: number;
  usedIn: string[];
};

type SlotItem = { key: string; problemId: string | null };

export function DraftEditor({
  contestId,
  numProblems,
  draft,
  initialSlots,
  pool,
}: {
  contestId: string;
  numProblems: number;
  draft: { id: string; name: string } | null;
  initialSlots: (string | null)[];
  pool: PoolProblem[];
}) {
  const [slots, setSlots] = useState<SlotItem[]>(() => initialSlots.map((p, i) => ({ key: `s${i}`, problemId: p })));
  const [name, setName] = useState(draft?.name ?? "");
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [subfield, setSubfield] = useState("");
  const [hideUsed, setHideUsed] = useState(false);
  const [sort, setSort] = useState<"rating" | "newest" | "name">("rating");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const dirty = useMemo(
    () => name !== (draft?.name ?? "") || slots.length !== initialSlots.length || slots.some((s, i) => s.problemId !== initialSlots[i]),
    [name, slots, draft, initialSlots],
  );
  const inDraft = useMemo(() => new Map(slots.map((s, i) => [s.problemId, i + 1]).filter(([p]) => p) as [string, number][]), [slots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool
      .filter((p) => !subfield || p.subfield === subfield)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.author.toLowerCase().includes(q))
      .filter((p) => !hideUsed || (p.usedIn.length === 0 && !inDraft.has(p.id)))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "newest") return 0;
        const am = a.median ?? (a.tooEasy > a.tooHard ? 0 : a.tooHard ? 99 : 50);
        const bm = b.median ?? (b.tooEasy > b.tooHard ? 0 : b.tooHard ? 99 : 50);
        return am - bm;
      });
  }, [pool, subfield, query, hideUsed, inDraft, sort]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = slots.findIndex((s) => s.key === active.id);
    const to = slots.findIndex((s) => s.key === over.id);
    setSlots((s) => arrayMove(s, from, to));
    setSelected(null);
  }

  function place(problemId: string) {
    setMessage(null);
    if (inDraft.has(problemId)) {
      setMessage(`Already in the draft as #${inDraft.get(problemId)}.`);
      return;
    }
    let idx = selected;
    if (idx == null || slots[idx].problemId) {
      idx = slots.findIndex((s) => !s.problemId);
    }
    if (idx === -1) {
      if (selected != null) idx = selected;
      else {
        setMessage("All slots are full. Select a slot to replace it, or remove a problem first.");
        return;
      }
    }
    setSlots((s) => s.map((x, i) => (i === idx ? { ...x, problemId } : x)));
    setSelected(null);
  }

  function remove(i: number) {
    setSlots((s) => s.map((x, j) => (j === i ? { ...x, problemId: null } : x)));
  }

  function addSlot() {
    setSlots((s) => [...s, { key: `s${Date.now()}`, problemId: null }]);
  }
  function trimSlots() {
    setSlots((s) => {
      let last = s.length - 1;
      while (last >= numProblems && !s[last].problemId) last--;
      return s.slice(0, Math.max(numProblems, last + 1));
    });
  }

  const submit = (mode: "save" | "new") => {
    setMessage(null);
    start(async () => {
      const ids = slots.map((s) => s.problemId);
      try {
        if (mode === "save" && draft) {
          await saveDraft(draft.id, name, ids);
          setMessage("Saved.");
        } else {
          await createDraft(contestId, name, ids);
        }
      } catch (e) {
        // redirect() throws internally in Next; real errors have a message
        const msg = (e as Error)?.message ?? "";
        if (msg && !msg.includes("NEXT_REDIRECT")) setMessage(`Error: ${msg}`);
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="card">
        <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold">Paper ({slots.filter((s) => s.problemId).length}/{numProblems})</h2>
          <span className="text-xs text-slate-500">drag to reorder · click a slot to select it</span>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slots.map((s) => s.key)} strategy={verticalListSortingStrategy}>
            <ol className="p-2 space-y-1">
              {slots.map((s, i) => (
                <SlotRow key={s.key} item={s} index={i} problem={s.problemId ? byId.get(s.problemId) : undefined} selected={selected === i} extra={i >= numProblems} onSelect={() => setSelected(selected === i ? null : i)} onRemove={() => remove(i)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        <div className="px-4 py-2 border-t border-slate-100 flex gap-3 text-xs">
          <button type="button" onClick={addSlot} className="text-indigo-600 hover:underline cursor-pointer">
            + extra slot
          </button>
          {slots.length > numProblems && (
            <button type="button" onClick={trimSlots} className="text-slate-500 hover:underline cursor-pointer">
              remove empty extra slots
            </button>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-lg space-y-2">
          <div className="flex gap-2 items-center flex-wrap">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input max-w-xs" placeholder={draft ? "Draft name" : "New draft name (optional)"} />
            {draft && (
              <button type="button" onClick={() => submit("save")} disabled={pending || !dirty} className="btn-primary">
                Save changes
              </button>
            )}
            <button type="button" onClick={() => submit("new")} disabled={pending} className={draft ? "btn-secondary" : "btn-primary"}>
              {draft ? "Save as new draft" : "Create draft"}
            </button>
            {dirty && draft && (
              <button
                type="button"
                onClick={() => {
                  setSlots(initialSlots.map((p, i) => ({ key: `s${i}`, problemId: p })));
                  setName(draft.name);
                }}
                className="btn-ghost"
              >
                Discard
              </button>
            )}
            {dirty && <span className="text-xs text-amber-600">unsaved changes</span>}
          </div>
          {message && <p className="text-sm text-slate-700">{message}</p>}
        </div>
      </section>

      <section className="card">
        <div className="px-4 py-2 border-b border-slate-200">
          <h2 className="font-semibold">Problem pool</h2>
        </div>
        <div className="p-3 flex flex-wrap gap-2 text-sm border-b border-slate-100">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="input grow min-w-32" placeholder="Search name or author" />
          <select value={subfield} onChange={(e) => setSubfield(e.target.value)} className="input w-auto">
            <option value="">All subfields</option>
            {SUBFIELDS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="input w-auto">
            <option value="rating">Sort: easiest first</option>
            <option value="newest">Sort: newest</option>
            <option value="name">Sort: name</option>
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={hideUsed} onChange={(e) => setHideUsed(e.target.checked)} /> hide used
          </label>
        </div>
        <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
          {filtered.length === 0 && <li className="p-4 text-sm text-slate-500">No problems match.</li>}
          {filtered.map((p) => {
            const pos = inDraft.get(p.id);
            return (
              <li key={p.id} className={`px-3 py-2 flex items-center gap-2 text-sm ${pos ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                <button type="button" onClick={() => place(p.id)} disabled={!!pos} className="btn-secondary px-2 py-0.5 shrink-0" title="Add to paper">
                  {pos ? `#${pos}` : "+"}
                </button>
                <SubfieldBadge value={p.subfield} short />
                <div className="min-w-0 grow">
                  <div className="flex items-center gap-2">
                    <Link href={`/problems/${p.id}`} target="_blank" className="font-medium truncate hover:underline">
                      {p.name}
                    </Link>
                    <span className="text-xs text-slate-500 truncate">{p.author}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex gap-2 flex-wrap">
                    <span className={p.rating === "—" ? "text-slate-400" : "text-slate-700 font-medium"}>{p.rating}</span>
                    <span title="solved by">👀 {p.solvedCount}{p.solvedByMe ? " (you)" : ""}</span>
                    {p.usedIn.length > 0 && <span title={p.usedIn.join(", ")}>📄 in {p.usedIn.length} other draft{p.usedIn.length > 1 ? "s" : ""}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SlotRow({
  item,
  index,
  problem,
  selected,
  extra,
  onSelect,
  onRemove,
}: {
  item: SlotItem;
  index: number;
  problem: PoolProblem | undefined;
  selected: boolean;
  extra: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm bg-white ${selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"} ${isDragging ? "opacity-70 shadow-lg" : ""} ${extra ? "border-dashed" : ""}`}
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 px-1 touch-none" title="Drag to reorder" aria-label="Drag to reorder">
        ⋮⋮
      </button>
      <span className="w-6 text-right font-semibold text-slate-500 tabular-nums">{index + 1}.</span>
      <button type="button" onClick={onSelect} className="min-w-0 grow text-left cursor-pointer">
        {problem ? (
          <span className="flex items-center gap-2 min-w-0">
            <SubfieldBadge value={problem.subfield} short />
            <span className="font-medium truncate">{problem.name}</span>
            <span className="text-xs text-slate-500 whitespace-nowrap">{problem.rating}</span>
            <span className="text-xs text-slate-400 whitespace-nowrap">👀 {problem.solvedCount}</span>
          </span>
        ) : (
          <span className="text-slate-400 italic">{selected ? "click a problem in the pool →" : "empty"}</span>
        )}
      </button>
      {problem && (
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-600 px-1 cursor-pointer" title="Remove from paper" aria-label="Remove">
          ✕
        </button>
      )}
    </li>
  );
}
