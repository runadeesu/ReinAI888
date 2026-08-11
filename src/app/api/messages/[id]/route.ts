import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

const patchSchema = z.object({
  isPinned: z.boolean().optional(),
  toggleReaction: z.string().min(1).max(8).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const message = await prisma.message.findUnique({
    where: { id },
    include: { conversation: { select: { userId: true } } },
  });
  if (!message || message.conversation.userId !== userId) {
    return NextResponse.json({ error: "メッセージが見つかりません" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }

  const data: { isPinned?: boolean; reactions?: string } = {};

  if (parsed.data.isPinned !== undefined) {
    data.isPinned = parsed.data.isPinned;
  }

  if (parsed.data.toggleReaction) {
    const current: string[] = JSON.parse(message.reactions || "[]");
    const emoji = parsed.data.toggleReaction;
    const next = current.includes(emoji) ? current.filter((e) => e !== emoji) : [...current, emoji];
    data.reactions = JSON.stringify(next);
  }

  const updated = await prisma.message.update({ where: { id }, data });

  return NextResponse.json({
    message: { id: updated.id, isPinned: updated.isPinned, reactions: JSON.parse(updated.reactions) },
  });
}
