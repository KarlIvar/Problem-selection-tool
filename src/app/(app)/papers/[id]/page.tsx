import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { fmtDate } from "@/lib/util";
import { addContestComment } from "@/actions/contests";
import { deleteDraft, duplicateDraft } from "@/actions/drafts";
import { CommentThread } from "@/components/CommentThread";
import { SubfieldBadge } from "@/components/SubfieldBadge";

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, group, isAdmin } = await requireContext();
  const contest = await prisma.contest.findFirst({
    where: { id, groupId: group.id },
    include: {
      drafts: {
        orderBy: { updatedAt: "desc" },
        include: { createdBy: { select: { name: true } }, slots: { orderBy: { position: "asc" }, include: { problem: { select: { id: true, name: true, subfield: true } } } } },
      },
      comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      images: { select: { id: true, filename: true } },
    },
  });
  if (!contest) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/papers" className="text-sm text-indigo-600 hover:underline">← All papers</Link>
          <h1 className="text-2xl font-bold">{contest.name}</h1>
          <p className="text-sm text-slate-500">{contest.numProblems} problems · {contest.drafts.length} drafts</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/papers/${contest.id}/formatting`} className="btn-secondary">
            Paper formatting
          </Link>
          <Link href={`/papers/${contest.id}/drafts/new`} className="btn-primary">
            + New draft
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Drafts</h2>
        {contest.drafts.length === 0 && <p className="text-sm text-slate-500 card p-4">No drafts yet. Create one to start selecting problems.</p>}
        {contest.drafts.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <Link href={`/papers/${contest.id}/drafts/${d.id}`} className="text-lg font-semibold text-indigo-700 hover:underline">
                  {d.name}
                </Link>
                <div className="text-xs text-slate-500">
                  {d.slots.length}/{contest.numProblems} slots filled · created by {d.createdBy?.name ?? "?"} {fmtDate(d.createdAt)} · updated {fmtDate(d.updatedAt)}
                </div>
              </div>
              <div className="flex gap-1 items-center">
                <Link href={`/papers/${contest.id}/drafts/${d.id}`} className="btn-secondary">
                  Open
                </Link>
                <a href={`/api/drafts/${d.id}/export`} className="btn-ghost" title="Download .zip with .tex and images">
                  Export
                </a>
                <form action={duplicateDraft}>
                  <input type="hidden" name="draftId" value={d.id} />
                  <button className="btn-ghost">Duplicate</button>
                </form>
                <form action={deleteDraft}>
                  <input type="hidden" name="draftId" value={d.id} />
                  <button className="btn-ghost text-red-600">Delete</button>
                </form>
              </div>
            </div>
            <ol className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {Array.from({ length: Math.max(contest.numProblems, d.slots[d.slots.length - 1]?.position ?? 0) }, (_, i) => i + 1).map((pos) => {
                const s = d.slots.find((x) => x.position === pos);
                return (
                  <li key={pos} className="flex items-center gap-2">
                    <span className="w-6 text-right text-slate-400 tabular-nums">{pos}.</span>
                    {s ? (
                      <>
                        <SubfieldBadge value={s.problem.subfield} short />
                        <Link href={`/problems/${s.problem.id}`} className="hover:underline truncate">
                          {s.problem.name}
                        </Link>
                      </>
                    ) : (
                      <span className="text-slate-300 italic">empty</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      <CommentThread comments={contest.comments} currentUserId={user.id} isAdmin={isAdmin} addAction={addContestComment} hiddenFields={{ contestId: contest.id }} title={`Discussion: ${contest.name}`} />
    </div>
  );
}
