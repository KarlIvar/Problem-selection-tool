import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { updateFormatting, uploadContestImage, deleteContestImage } from "@/actions/contests";
import { FormattingForm, ImageUploadForm } from "@/components/FormattingForm";

export default async function FormattingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { group } = await requireContext();
  const contest = await prisma.contest.findFirst({ where: { id, groupId: group.id }, include: { images: { select: { id: true, filename: true, size: true, mimeType: true }, orderBy: { filename: "asc" } } } });
  if (!contest) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/papers/${contest.id}`} className="text-sm text-indigo-600 hover:underline">← {contest.name}</Link>
        <h1 className="text-2xl font-bold">Paper formatting: {contest.name}</h1>
        <p className="text-sm text-slate-500">
          The LaTeX skeleton used when exporting a draft of this paper. Edits are noted in the paper's discussion thread.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <FormattingForm action={updateFormatting.bind(null, contest.id)} initial={{ formatting: contest.formatting, problemTemplate: contest.problemTemplate, solutionTemplate: contest.solutionTemplate }} />
        <aside className="space-y-4">
          <section className="card p-4 text-sm space-y-2">
            <h2 className="font-semibold">Placeholders</h2>
            <p className="text-slate-600">In the paper skeleton:</p>
            <ul className="font-mono text-xs space-y-0.5 text-slate-700">
              <li>&lt;&lt;PROBLEMS&gt;&gt; – all problems, using the problem template</li>
              <li>&lt;&lt;SOLUTIONS&gt;&gt; – all solutions, using the solution template</li>
              <li>&lt;&lt;CONTEST&gt;&gt; – paper name</li>
              <li>&lt;&lt;DRAFT&gt;&gt; – draft name</li>
              <li>&lt;&lt;DATE&gt;&gt; – export date</li>
            </ul>
            <p className="text-slate-600">In the problem / solution templates:</p>
            <ul className="font-mono text-xs space-y-0.5 text-slate-700">
              <li>&lt;&lt;NUMBER&gt;&gt; &lt;&lt;NAME&gt;&gt; &lt;&lt;AUTHOR&gt;&gt; &lt;&lt;SUBFIELD&gt;&gt;</li>
              <li>&lt;&lt;STATEMENT&gt;&gt; &lt;&lt;SOLUTION&gt;&gt;</li>
              <li>&lt;&lt;IMAGE&gt;&gt; – filename of the problem image (exported in the zip), or empty</li>
              <li>&lt;&lt;IFIMAGE&gt;&gt;…&lt;&lt;ENDIF&gt;&gt; – only kept when the problem has an image</li>
            </ul>
          </section>
          <section className="card p-4 space-y-3">
            <h2 className="font-semibold">Images for this paper</h2>
            <p className="text-xs text-slate-500">Logos and figures referenced from the skeleton. They are exported next to the .tex file with these filenames.</p>
            <ul className="text-sm divide-y divide-slate-100">
              {contest.images.length === 0 && <li className="text-slate-400 py-1">No images uploaded.</li>}
              {contest.images.map((img) => (
                <li key={img.id} className="py-1.5 flex items-center gap-2">
                  {img.mimeType.startsWith("image/") && <img src={`/api/images/${img.id}`} alt="" className="h-8 w-8 object-contain border border-slate-200 rounded" />}
                  <span className="font-mono text-xs truncate grow">{img.filename}</span>
                  <span className="text-xs text-slate-400">{(img.size / 1024).toFixed(0)} kB</span>
                  <form action={deleteContestImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <button className="text-xs text-slate-400 hover:text-red-600 cursor-pointer">delete</button>
                  </form>
                </li>
              ))}
            </ul>
            <ImageUploadForm action={uploadContestImage.bind(null, contest.id)} />
          </section>
        </aside>
      </div>
    </div>
  );
}
