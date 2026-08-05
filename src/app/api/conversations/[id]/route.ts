import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { conversationSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const patchSchema = conversationSchema.partial().extend({
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ conversation: { ...conversation, tags: JSON.parse(conversation.tags) } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }

  const { tags, ...rest } = parsed.data;

  const conversation = await prisma.conversation.update({
    where: { id },
    data: {
      ...rest,
      ...(tags ? { tags: JSON.stringify(tags) } : {}),
    },
  });

  return NextResponse.json({ conversation });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
