import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  if (existing.shareId) {
    return NextResponse.json({ shareId: existing.shareId });
  }

  const shareId = crypto.randomBytes(16).toString("hex");
  await prisma.conversation.update({ where: { id }, data: { shareId } });

  return NextResponse.json({ shareId });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  await prisma.conversation.update({ where: { id }, data: { shareId: null } });
  return NextResponse.json({ ok: true });
}
