import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.userId !== userId) {
    return NextResponse.json({ error: "キーが見つかりません" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
