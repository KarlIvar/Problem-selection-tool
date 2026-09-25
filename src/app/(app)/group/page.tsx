import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { regenerateInviteCode, renameGroup, setMemberRole, removeMember } from "@/actions/auth";
import { updateContest, moveContest, deleteContest } from "@/actions/contests";
import { CreateGroupForm, JoinGroupForm } from "@/components/GroupForms";
import { CreateContestForm } from "@/components/CreateContestForm";
import { fmtDate } from "@/lib/util";

export default async function GroupPage() {
  const { user, group, isAdmin } = await requireContext();
  const [g, members, contests] = await Promise.all([
    prisma.group.findUnique({ where: { id: group.id } }),
    prisma.membership.findMany({ where: { groupId: group.id }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.contest.findMany({ where: { groupId: group.id }, orderBy: { position: "asc" }, include: { _count: { select: { drafts: true, ratings: true } } } }),
  ]);
  if (!g) return null;
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{g.name}</h1>
        <p className="text-sm text-slate-500">Problem group · {members.length} members · you are {isAdmin ? "an admin" : "a member"}</p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Invite people</h2>
        <p className="text-sm text-slate-600">
          Share this invite code with new members. They enter it when registering (or under “Groups”). Problems, papers and drafts are only visible inside this group.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="text-lg font-mono tracking-widest bg-slate-100 rounded px-3 py-1">{g.inviteCode}</code>
          {isAdmin && (
            <form action={regenerateInviteCode}>
              <button className="btn-secondary">Generate new code</button>
            </form>
          )}
        </div>
        {isAdmin && (
          <form action={renameGroup} className="flex gap-2 items-end max-w-md">
            <div className="grow">
              <label className="label">Group name</label>
              <input name="name" defaultValue={g.name} className="input" />
            </div>
            <button className="btn-secondary">Rename</button>
          </form>
        )}
      </section>

      <section className="card">
        <div className="px-4 py-2 border-b border-slate-200 font-semibold">Members</div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.user.id}>
                <td className="px-4 py-2">
                  <span className="font-medium">{m.user.name}</span> <span className="text-slate-500">{m.user.email}</span>
                </td>
                <td className="px-4 py-2 text-slate-500">joined {fmtDate(m.createdAt)}</td>
                <td className="px-4 py-2 text-right">
                  {isAdmin && m.user.id !== user.id ? (
                    <div className="flex gap-2 justify-end">
                      <form action={setMemberRole}>
                        <input type="hidden" name="userId" value={m.user.id} />
                        <input type="hidden" name="role" value={m.role === "ADMIN" ? "MEMBER" : "ADMIN"} />
                        <button className="btn-ghost">{m.role === "ADMIN" ? "Make member" : "Make admin"}</button>
                      </form>
                      <form action={removeMember}>
                        <input type="hidden" name="userId" value={m.user.id} />
                        <button className="btn-ghost text-red-600">Remove</button>
                      </form>
                    </div>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-700">{m.role.toLowerCase()}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" id="contests">
        <div className="px-4 py-2 border-b border-slate-200">
          <h2 className="font-semibold">Contests / papers</h2>
          <p className="text-xs text-slate-500">In increasing order of difficulty. The number of problems sets how many slots each draft has and which numbers can be used when rating.</p>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {contests.map((c, i) => (
              <tr key={c.id}>
                <td className="px-4 py-2 w-full">
                  {isAdmin ? (
                    <form action={updateContest} className="flex gap-2 items-center">
                      <input type="hidden" name="id" value={c.id} />
                      <input name="name" defaultValue={c.name} className="input" />
                      <input name="numProblems" type="number" min={1} max={60} defaultValue={c.numProblems} className="input w-20" />
                      <button className="btn-secondary">Save</button>
                    </form>
                  ) : (
                    <span>
                      <span className="font-medium">{c.name}</span> <span className="text-slate-500">· {c.numProblems} problems</span>
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-xs text-slate-500 whitespace-nowrap">
                  {c._count.drafts} drafts · {c._count.ratings} ratings
                </td>
                {isAdmin && (
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex gap-1">
                      <form action={moveContest}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="dir" value="up" />
                        <button className="btn-ghost" disabled={i === 0}>↑</button>
                      </form>
                      <form action={moveContest}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="dir" value="down" />
                        <button className="btn-ghost" disabled={i === contests.length - 1}>↓</button>
                      </form>
                      <form action={deleteContest}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="btn-ghost text-red-600" title="Deletes the paper, its drafts, ratings and thread">✕</button>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <div className="px-4 py-3 border-t border-slate-200">
            <CreateContestForm />
          </div>
        )}
      </section>

      <section className="card p-4 grid gap-4 md:grid-cols-2">
        <JoinGroupForm />
        <CreateGroupForm />
      </section>
    </div>
  );
}
