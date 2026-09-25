import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { updateProblem, deleteProblem } from "@/actions/problems";
import { ProblemForm } from "@/components/ProblemForm";

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, group, isAdmin } = await requireContext();
  const [problem, members] = await Promise.all([
    prisma.problem.findFirst({ where: { id, groupId: group.id } }),
    prisma.membership.findMany({ where: { groupId: group.id }, include: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  if (!problem) notFound();
  const action = updateProblem.bind(null, problem.id);
  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold">Edit problem</h1>
      <p className="text-sm text-slate-500">Changes to the statement or solution are noted automatically in the discussion thread.</p>
      <div className="card p-5">
        <ProblemForm
          action={action}
          initial={{ name: problem.name, statement: problem.statement, solution: problem.solution, subfield: problem.subfield, authorId: problem.authorId ?? user.id, imageId: problem.imageId }}
          members={members.map((m) => m.user)}
          cancelHref={`/problems/${problem.id}`}
          submitLabel="Save changes"
        />
      </div>
      {(isAdmin || problem.createdById === user.id) && (
        <form action={deleteProblem} className="card p-4 flex items-center justify-between">
          <input type="hidden" name="id" value={problem.id} />
          <span className="text-sm text-slate-600">Deleting removes the problem, its thread, ratings and its slots in all drafts.</span>
          <button className="btn-danger">Delete problem</button>
        </form>
      )}
    </div>
  );
}
