import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { languageLabel } from "@/lib/constants";
import { summarizeRatings } from "@/lib/ratings";
import { fmtDate } from "@/lib/util";
import { toggleSolved, setRating, addProblemComment } from "@/actions/problems";
import { Latex } from "@/components/Latex";
import { SubfieldBadge } from "@/components/SubfieldBadge";
import { CommentThread } from "@/components/CommentThread";
import { RatingSelect } from "@/components/RatingForm";

export default async function ProblemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang } = await searchParams;
  const { user, group, isAdmin } = await requireContext();
  const [problem, contests] = await Promise.all([
    prisma.problem.findFirst({
      where: { id, groupId: group.id },
      include: {
        author: { select: { name: true } },
        createdBy: { select: { name: true } },
        translations: { orderBy: { language: "asc" }, include: { updatedBy: { select: { name: true } } } },
        solves: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        ratings: { include: { user: { select: { name: true } } } },
        comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        draftSlots: { include: { draft: { include: { contest: { select: { id: true, name: true } } } } } },
      },
    }),
    prisma.contest.findMany({ where: { groupId: group.id }, orderBy: { position: "asc" } }),
  ]);
  if (!problem) notFound();

  const translation = lang ? problem.translations.find((t) => t.language === lang) : undefined;
  const statement = translation?.statement ?? problem.statement;
  const solution = translation?.solution || problem.solution;
  const solvedByMe = problem.solves.some((s) => s.user.id === user.id);
  const summary = summarizeRatings(problem.ratings, contests.map((c) => c.id));
  const myRatings = new Map(problem.ratings.filter((r) => r.userId === user.id).map((r) => [r.contestId, r]));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4 min-w-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/problems" className="text-sm text-indigo-600 hover:underline">← All problems</Link>
            <h1 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
              {problem.name} <SubfieldBadge value={problem.subfield} />
            </h1>
            <p className="text-sm text-slate-500">
              by <span className="font-medium text-slate-700">{problem.author?.name ?? "unknown"}</span> · added {fmtDate(problem.createdAt)} by {problem.createdBy.name}
            </p>
          </div>
          <Link href={`/problems/${problem.id}/edit`} className="btn-secondary">
            Edit
          </Link>
        </div>

        <div className="flex items-center gap-1 text-sm flex-wrap">
          <Link href={`/problems/${problem.id}`} className={`badge ${!translation ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            English
          </Link>
          {problem.translations.map((t) => (
            <Link key={t.language} href={`/problems/${problem.id}?lang=${t.language}`} className={`badge ${translation?.language === t.language ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              {languageLabel(t.language)}
            </Link>
          ))}
          <Link href={`/problems/${problem.id}/translate`} className="badge bg-white border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50">
            + translation
          </Link>
          {translation && (
            <Link href={`/problems/${problem.id}/translate?lang=${translation.language}`} className="ml-2 text-xs text-indigo-600 hover:underline">
              edit {languageLabel(translation.language)} translation
            </Link>
          )}
        </div>

        <section className="card p-5">
          <h2 className="label">Statement{translation ? ` (${languageLabel(translation.language)})` : ""}</h2>
          <Latex className="text-[15px]">{statement}</Latex>
          {problem.imageId && (
            <div className="mt-4">
              <img src={`/api/images/${problem.imageId}`} alt="" className="max-h-96 max-w-full rounded border border-slate-200" />
            </div>
          )}
        </section>

        <details className="card group">
          <summary className="px-5 py-3 cursor-pointer font-medium text-slate-700 select-none">
            <span className="group-open:hidden">Show solution</span>
            <span className="hidden group-open:inline">Hide solution</span>
            {translation && !translation.solution && <span className="ml-2 text-xs text-slate-400">(no translated solution — showing English)</span>}
          </summary>
          <div className="px-5 pb-5 border-t border-slate-100 pt-3">
            {solution ? <Latex className="text-[15px]">{solution}</Latex> : <p className="text-sm text-slate-500">No solution written yet.</p>}
          </div>
        </details>

        <CommentThread comments={problem.comments} currentUserId={user.id} isAdmin={isAdmin} addAction={addProblemComment} hiddenFields={{ problemId: problem.id }} />
      </div>

      <aside className="space-y-4">
        <section className="card p-4 space-y-3">
          <form action={toggleSolved}>
            <input type="hidden" name="problemId" value={problem.id} />
            <button className={`w-full justify-center ${solvedByMe ? "btn bg-emerald-600 text-white hover:bg-emerald-700" : "btn-secondary"}`}>
              👀 {solvedByMe ? "You solved this" : "Mark as solved by me"}
            </button>
          </form>
          <div className="text-sm">
            <div className="label">Solved by ({problem.solves.length})</div>
            {problem.solves.length ? (
              <ul className="flex flex-wrap gap-1">
                {problem.solves.map((s) => (
                  <li key={s.user.id} className="badge bg-emerald-50 text-emerald-800" title={fmtDate(s.createdAt)}>
                    {s.user.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Nobody yet.</p>
            )}
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <div>
            <h2 className="font-semibold">Your difficulty rating</h2>
            <p className="text-xs text-slate-500">For each paper: which problem number should this be?</p>
          </div>
          <ul className="space-y-2">
            {contests.map((c) => {
              const mine = myRatings.get(c.id);
              return (
                <li key={c.id} className="text-sm">
                  <div className="font-medium text-slate-700 mb-0.5">{c.name}</div>
                  <RatingSelect problemId={problem.id} contestId={c.id} numProblems={c.numProblems} current={mine ? { kind: mine.kind, number: mine.number } : null} action={setRating} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold mb-2">All ratings</h2>
          <table className="w-full text-sm">
            <tbody>
              {contests.map((c) => {
                const s = summary[c.id];
                const byUser = problem.ratings.filter((r) => r.contestId === c.id);
                return (
                  <tr key={c.id} className="border-t border-slate-100 align-top">
                    <td className="py-1.5 pr-2 text-slate-600">{c.name}</td>
                    <td className="py-1.5 text-right">
                      {s.count === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <div>
                          {s.median != null && (
                            <span className="font-semibold" title={`mean ${s.mean?.toFixed(2)}`}>
                              P{Number.isInteger(s.median) ? s.median : s.median.toFixed(1)}
                            </span>
                          )}
                          <div className="text-xs text-slate-500">
                            {byUser.map((r) => `${r.user.name}: ${r.kind === "NUMBER" ? `P${r.number}` : r.kind === "TOO_EASY" ? "too easy" : r.kind === "TOO_HARD" ? "too hard" : "?"}`).join(", ")}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {problem.draftSlots.length > 0 && (
          <section className="card p-4">
            <h2 className="font-semibold mb-2">Used in drafts</h2>
            <ul className="text-sm space-y-1">
              {problem.draftSlots.map((s) => (
                <li key={`${s.draft.id}-${s.position}`}>
                  <Link href={`/papers/${s.draft.contest.id}/drafts/${s.draft.id}`} className="text-indigo-600 hover:underline">
                    {s.draft.contest.name} · {s.draft.name}
                  </Link>{" "}
                  <span className="text-slate-500">as #{s.position}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
