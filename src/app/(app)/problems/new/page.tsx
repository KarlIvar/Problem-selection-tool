import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { createProblem } from "@/actions/problems";
import { ProblemForm } from "@/components/ProblemForm";

export default async function NewProblemPage() {
  const { user, group } = await requireContext();
  const members = await prisma.membership.findMany({ where: { groupId: group.id }, include: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } });
  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold">New problem</h1>
      <div className="card p-5">
        <ProblemForm
          action={createProblem}
          initial={{ name: "", statement: "", solution: "", subfield: "ALGEBRA", authorId: user.id, imageId: null }}
          members={members.map((m) => m.user)}
          cancelHref="/problems"
          submitLabel="Create problem"
        />
      </div>
    </div>
  );
}
