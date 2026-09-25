import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { saveTranslation, deleteTranslation } from "@/actions/problems";
import { TranslationForm } from "@/components/TranslationForm";
import { Latex } from "@/components/Latex";

export default async function TranslatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang } = await searchParams;
  const { group } = await requireContext();
  const problem = await prisma.problem.findFirst({ where: { id, groupId: group.id }, include: { translations: true } });
  if (!problem) notFound();
  const existing = lang ? problem.translations.find((t) => t.language === lang) : undefined;
  const action = saveTranslation.bind(null, problem.id);
  return (
    <div className="space-y-4">
      <div>
        <Link href={`/problems/${problem.id}`} className="text-sm text-indigo-600 hover:underline">← {problem.name}</Link>
        <h1 className="text-2xl font-bold">{existing ? `Edit ${existing.language.toUpperCase()} translation` : "Add translation"}</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <div className="card p-4">
            <div className="label">English statement</div>
            <Latex className="text-sm">{problem.statement}</Latex>
          </div>
          <div className="card p-4">
            <div className="label">English solution</div>
            <Latex className="text-sm">{problem.solution || "—"}</Latex>
          </div>
        </div>
        <div className="card p-5">
          <TranslationForm
            action={action}
            initial={{ language: existing?.language ?? lang ?? "sv", statement: existing?.statement ?? "", solution: existing?.solution ?? "" }}
            lockLanguage={!!existing}
            cancelHref={`/problems/${problem.id}`}
          />
          {existing && (
            <form action={deleteTranslation} className="mt-4 pt-4 border-t border-slate-200">
              <input type="hidden" name="problemId" value={problem.id} />
              <input type="hidden" name="language" value={existing.language} />
              <button className="btn-danger">Delete this translation</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
