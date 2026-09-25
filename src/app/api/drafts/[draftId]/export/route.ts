import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { subfieldLabel } from "@/lib/constants";

function fill(template: string, vars: Record<string, string>) {
  let out = template;
  // <<IFIMAGE>>...<<ENDIF>> blocks
  out = out.replace(/<<IFIMAGE>>([\s\S]*?)<<ENDIF>>/g, (_, inner) => (vars.IMAGE ? inner : ""));
  for (const [k, v] of Object.entries(vars)) out = out.split(`<<${k}>>`).join(v);
  return out;
}

function safeName(s: string) {
  return s.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "paper";
}

export async function GET(req: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const session = await readSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") ?? "";
  const format = url.searchParams.get("format") ?? "zip";

  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: {
      contest: { include: { images: true, group: { include: { memberships: { where: { userId: session.userId } } } } } },
      slots: { orderBy: { position: "asc" }, include: { problem: { include: { author: true, image: true, translations: lang ? { where: { language: lang } } : false } } } },
    },
  });
  if (!draft || draft.contest.group.memberships.length === 0) return new NextResponse("Not found", { status: 404 });
  const contest = draft.contest;

  const zip = new JSZip();
  const problemImages: { name: string; data: Buffer }[] = [];
  const rendered = draft.slots.map((s) => {
    const p = s.problem;
    const tr = lang && Array.isArray(p.translations) ? p.translations[0] : undefined;
    let imageName = "";
    if (p.image) {
      const ext = p.image.filename.includes(".") ? p.image.filename.slice(p.image.filename.lastIndexOf(".")) : "";
      imageName = `problem-${s.position}${ext}`;
      problemImages.push({ name: imageName, data: Buffer.from(p.image.data) });
    }
    const vars = {
      NUMBER: String(s.position),
      NAME: p.name,
      AUTHOR: p.author?.name ?? "",
      SUBFIELD: subfieldLabel(p.subfield),
      STATEMENT: tr?.statement ?? p.statement,
      SOLUTION: (tr?.solution || p.solution) ?? "",
      IMAGE: imageName,
    };
    return { problem: fill(contest.problemTemplate, vars), solution: fill(contest.solutionTemplate, vars) };
  });

  const tex = fill(contest.formatting, {
    PROBLEMS: rendered.map((r) => r.problem).join("\n"),
    SOLUTIONS: rendered.map((r) => r.solution).join("\n"),
    CONTEST: contest.name,
    DRAFT: draft.name,
    DATE: new Date().toISOString().slice(0, 10),
  });

  const base = safeName(`${contest.name}-${draft.name}${lang ? `-${lang}` : ""}`);
  if (format === "tex") {
    return new NextResponse(tex, {
      headers: { "Content-Type": "application/x-tex; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.tex"` },
    });
  }
  zip.file(`${base}.tex`, tex);
  for (const img of contest.images) zip.file(img.filename, Buffer.from(img.data));
  for (const img of problemImages) zip.file(img.name, img.data);
  const blob = await zip.generateAsync({ type: "arraybuffer" });
  return new NextResponse(blob, {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${base}.zip"` },
  });
}
