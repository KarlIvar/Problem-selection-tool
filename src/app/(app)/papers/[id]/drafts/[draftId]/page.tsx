import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { summarizeRatings, ratingLabel } from "@/lib/ratings";
import { languageLabel } from "@/lib/constants";
import { DraftEditor, type PoolProblem } from "@/components/DraftEditor";
import { Latex } from "@/components/Latex";
import { SubfieldBadge } from "@/components/SubfieldBadge";

export default async function DraftPage({ params, searchParams }: { params: Promise<{ id: string; draftId: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id, draftId } = await params;
  const { lang } = await searchParams;
  const { user, group } = await requireContext();
  const contest = await prisma.contest.findFirst({
    where: { id, groupId: group.id },
    include: { drafts: { select: { id: true, name: true, slots: { select: { position: true, problemId: true } } } } },
  });
  if (!contest) notFound();
  const draft = draftId === "new" ? null : contest.drafts.find((d) => d.id === draftId);
  if (draftId !== "new" && !draft) notFound();

  const problems = await prisma.problem.findMany({
    where: { groupId: group.id },
    include: {
      author: { select: { name: true } },
      solves: { select: { userId: true } },
      ratings: { where: { contestId: contest.id }, select: { contestId: true, kind: true, number: true } },
      translations: { select: { language: true, statement: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const usedIn = new Map<string, string[]>();
  for (const d of contest.drafts) {
    if (d.id === draft?.id) continue;
    for (const s of d.slots) usedIn.set(s.problemId, [...(usedIn.get(s.problemId) ?? []), d.name]);
  }
  const pool: PoolProblem[] = problems.map((p) => {
    const s = summarizeRatings(p.ratings, [contest.id])[contest.id];
    return {
      id: p.id,
      name: p.name,
      subfield: p.subfield,
      author: p.author?.name ?? "",
      solvedCount: p.solves.length,
      solvedByMe: p.solves.some((x) => x.userId === user.id),
      rating: ratingLabel(s),
      median: s.median,
      tooEasy: s.tooEasy,
      tooHard: s.tooHard,
      usedIn: usedIn.get(p.id) ?? [],
    };
  });

  const slotCount = Math.max(contest.numProblems, draft?.slots.reduce((m, s) => Math.max(m, s.position), 0) ?? 0);
  const initialSlots: (string | null)[] = Array.from({ length: slotCount }, (_, i) => draft?.slots.find((s) => s.position === i + 1)?.problemId ?? null);
  const languages = [...new Set(problems.flatMap((p) => p.translations.map((t) => t.language)))].sort();
  const byId = new Map(problems.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/papers/${contest.id}`} className="text-sm text-indigo-600 hover:underline">← {contest.name}</Link>
        <h1 className="text-2xl font-bold">{draft ? draft.name : "New draft"}</h1>
      </div>

      <DraftEditor contestId={contest.id} numProblems={contest.numProblems} draft={draft ? { id: draft.id, name: draft.name } : null} initialSlots={initialSlots} pool={pool} />

      {draft && (
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Preview of saved draft</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Language:</span>
              <Link href={`/papers/${contest.id}/drafts/${draft.id}`} className={`badge ${!lang ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                English
              </Link>
              {languages.map((l) => (
                <Link key={l} href={`/papers/${contest.id}/drafts/${draft.id}?lang=${l}`} className={`badge ${lang === l ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                  {languageLabel(l)}
                </Link>
              ))}
              <span className="mx-2 text-slate-300">|</span>
              <a href={`/api/drafts/${draft.id}/export${lang ? `?lang=${lang}` : ""}`} className="btn-secondary">
                Download .zip (.tex + images)
              </a>
              <a href={`/api/drafts/${draft.id}/export?format=tex${lang ? `&lang=${lang}` : ""}`} className="btn-ghost">
                .tex only
              </a>
            </div>
          </div>
          <ol className="space-y-3">
            {initialSlots.map((pid, i) => {
              const p = pid ? byId.get(pid) : undefined;
              const tr = p && lang ? p.translations.find((t) => t.language === lang) : undefined;
              return (
                <li key={i} className="card p-4 flex gap-4">
                  <div className="text-2xl font-bold text-slate-300 w-8 shrink-0 tabular-nums">{i + 1}</div>
                  {p ? (
                    <div className="min-w-0 grow">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <Link href={`/problems/${p.id}`} className="font-medium text-indigo-700 hover:underline">
                          {p.name}
                        </Link>
                        <SubfieldBadge value={p.subfield} />
                        <span className="text-slate-500">{p.author?.name}</span>
                        {lang && !tr && <span className="text-xs text-amber-600">no {languageLabel(lang)} translation — showing English</span>}
                      </div>
                      <Latex className="text-[15px]">{tr?.statement ?? p.statement}</Latex>
                      {p.imageId && <img src={`/api/images/${p.imageId}`} alt="" className="mt-2 max-h-64 rounded border border-slate-200" />}
                    </div>
                  ) : (
                    <div className="text-slate-300 italic">empty</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
