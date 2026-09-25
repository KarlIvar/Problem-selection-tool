import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { SUBFIELDS } from "@/lib/constants";
import { summarizeRatings, ratingLabel } from "@/lib/ratings";
import { SubfieldBadge } from "@/components/SubfieldBadge";

type Search = { q?: string; subfield?: string; solved?: string; author?: string; sort?: string };

export default async function ProblemsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { user, group } = await requireContext();

  const [problems, contests, members] = await Promise.all([
    prisma.problem.findMany({
      where: {
        groupId: group.id,
        ...(sp.subfield ? { subfield: sp.subfield } : {}),
        ...(sp.author ? { authorId: sp.author } : {}),
        ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { statement: { contains: sp.q } }] } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        solves: { select: { userId: true } },
        ratings: { select: { contestId: true, kind: true, number: true, userId: true } },
        _count: { select: { comments: { where: { isEvent: false } }, translations: true, draftSlots: true } },
      },
      orderBy: sp.sort === "name" ? { name: "asc" } : sp.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
    }),
    prisma.contest.findMany({ where: { groupId: group.id }, orderBy: { position: "asc" } }),
    prisma.membership.findMany({ where: { groupId: group.id }, include: { user: { select: { id: true, name: true } } } }),
  ]);

  const filtered = problems.filter((p) => {
    const solvedByMe = p.solves.some((s) => s.userId === user.id);
    if (sp.solved === "me") return solvedByMe;
    if (sp.solved === "notme") return !solvedByMe;
    if (sp.solved === "unrated") return !p.ratings.some((r) => r.userId === user.id);
    return true;
  });
  const contestIds = contests.map((c) => c.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Problems</h1>
        <Link href="/problems/new" className="btn-primary">
          + New problem
        </Link>
      </div>

      <form className="card p-3 flex flex-wrap gap-2 items-end text-sm" method="get">
        <div className="grow min-w-40">
          <label className="label">Search</label>
          <input name="q" defaultValue={sp.q ?? ""} className="input" placeholder="Name or statement" />
        </div>
        <div>
          <label className="label">Subfield</label>
          <select name="subfield" defaultValue={sp.subfield ?? ""} className="input">
            <option value="">All</option>
            {SUBFIELDS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Author</label>
          <select name="author" defaultValue={sp.author ?? ""} className="input">
            <option value="">Anyone</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="solved" defaultValue={sp.solved ?? ""} className="input">
            <option value="">All</option>
            <option value="me">Solved by me 👀</option>
            <option value="notme">Not solved by me</option>
            <option value="unrated">Not rated by me</option>
          </select>
        </div>
        <div>
          <label className="label">Sort</label>
          <select name="sort" defaultValue={sp.sort ?? ""} className="input">
            <option value="">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name</option>
          </select>
        </div>
        <button className="btn-secondary">Filter</button>
        <Link href="/problems" className="btn-ghost">
          Reset
        </Link>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Problem</th>
              <th className="text-left px-3 py-2">Subfield</th>
              <th className="text-left px-3 py-2">Author</th>
              <th className="text-center px-2 py-2" title="Solved by">👀</th>
              <th className="text-center px-2 py-2" title="Comments">💬</th>
              <th className="text-center px-2 py-2" title="Used in drafts">📄</th>
              {contests.map((c) => (
                <th key={c.id} className="text-left px-2 py-2 whitespace-nowrap" title={`Median suggested position in ${c.name}`}>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6 + contests.length} className="px-3 py-6 text-center text-slate-500">
                  No problems match.
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const solvedByMe = p.solves.some((s) => s.userId === user.id);
              const ratedByMe = p.ratings.some((r) => r.userId === user.id);
              const summary = summarizeRatings(p.ratings, contestIds);
              return (
                <tr key={p.id} className="hover:bg-indigo-50/40">
                  <td className="px-3 py-2">
                    <Link href={`/problems/${p.id}`} className="font-medium text-indigo-700 hover:underline">
                      {p.name}
                    </Link>
                    {p._count.translations > 0 && <span className="ml-2 text-xs text-slate-400" title="Has translations">🌐</span>}
                    {solvedByMe && !ratedByMe && <span className="ml-2 badge bg-amber-100 text-amber-800" title="You solved this but haven't rated it">rate me</span>}
                  </td>
                  <td className="px-3 py-2">
                    <SubfieldBadge value={p.subfield} />
                  </td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.author?.name ?? "—"}</td>
                  <td className={`px-2 py-2 text-center ${solvedByMe ? "font-semibold text-emerald-700" : "text-slate-600"}`}>{p.solves.length}</td>
                  <td className="px-2 py-2 text-center text-slate-600">{p._count.comments}</td>
                  <td className="px-2 py-2 text-center text-slate-600">{p._count.draftSlots}</td>
                  {contests.map((c) => (
                    <td key={c.id} className="px-2 py-2 text-slate-600 whitespace-nowrap text-xs">
                      {ratingLabel(summary[c.id])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {filtered.length} of {problems.length} problems. Rating columns show the median suggested problem number (P3 = "should be problem 3") and counts of "too easy" / "too hard" / "don't know" votes.
      </p>
    </div>
  );
}
