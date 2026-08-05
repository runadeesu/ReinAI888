import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { readFile, deleteFile } from "@/lib/files/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment || attachment.userId !== userId) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const buffer = await readFile(attachment.storagePath);

  // SVG and other browser-executable types must never be rendered inline
  // from user-uploaded content — that would be a same-origin stored-XSS
  // vector via the ambient session cookie. Only a strict safe allowlist
  // gets `inline`; everything else is forced to download.
  const INLINE_SAFE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
  ]);
  const disposition = INLINE_SAFE_TYPES.has(attachment.mimeType) ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(attachment.fileName)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment || attachment.userId !== userId) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  await deleteFile(attachment.storagePath);
  await prisma.attachment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
