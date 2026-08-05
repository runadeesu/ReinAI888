import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.promptCategory.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  await prisma.promptCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
