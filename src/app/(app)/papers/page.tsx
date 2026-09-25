import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { fmtDate } from "@/lib/util";

export default async function PapersPage() {
  const { group, isAdmin } = await requireContext();
  const contests = await prisma.contest.findMany({
    where: { groupId: group.id },
    orderBy: { position: "asc" },
    include: {
      drafts: { orderBy: { updatedAt: "desc" }, include: { _count: { select: { slots: true } }, createdBy: { select: { name: true } } } },
      _count: { select: { comments: { where: { isEvent: false } } } },
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Papers</h1>
        {isAdmin && (
          <Link href="/group#contests" className="btn-secondary">
            Manage contests
          </Link>
        )}
      </div>
      <p className="text-sm text-slate-500">One paper per contest, in roughly increasing order of difficulty. Each paper can have several drafts.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {contests.map((c) => (
          <div key={c.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/papers/${c.id}`} className="text-lg font-semibold text-indigo-700 hover:underline">
                  {c.name}
                </Link>
                <div className="text-xs text-slate-500">
                  {c.numProblems} problems · {c.drafts.length} drafts · {c._count.comments} comments
                </div>
              </div>
              <Link href={`/papers/${c.id}/drafts/new`} className="btn-primary">
                + Draft
              </Link>
            </div>
            {c.drafts.length > 0 ? (
              <ul className="text-sm divide-y divide-slate-100">
                {c.drafts.slice(0, 4).map((d) => (
                  <li key={d.id} className="py-1 flex justify-between gap-2">
                    <Link href={`/papers/${c.id}/drafts/${d.id}`} className="hover:underline">
                      {d.name}
                    </Link>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {d._count.slots}/{c.numProblems} · {fmtDate(d.updatedAt)}
                    </span>
                  </li>
                ))}
                {c.drafts.length > 4 && (
                  <li className="py-1 text-xs text-slate-500">
                    <Link href={`/papers/${c.id}`} className="hover:underline">
                      …and {c.drafts.length - 4} more
                    </Link>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No drafts yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
