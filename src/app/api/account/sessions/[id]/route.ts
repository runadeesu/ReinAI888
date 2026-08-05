import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
