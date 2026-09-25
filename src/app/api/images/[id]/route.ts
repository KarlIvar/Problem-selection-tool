import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const img = await prisma.image.findUnique({ where: { id } });
  if (!img || !user.groups.some((g) => g.id === img.groupId)) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mimeType,
      "Content-Length": String(img.size),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${img.filename}"`,
    },
  });
}
