import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { shareId } = await params;
  const source = await prisma.conversation.findUnique({
    where: { shareId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!source) {
    return NextResponse.json({ error: "共有された会話が見つかりません" }, { status: 404 });
  }

  const forked = await prisma.conversation.create({
    data: {
      userId,
      title: `${source.title} (フォーク)`,
      provider: source.provider,
      model: source.model,
      systemPrompt: source.systemPrompt,
      messages: {
        create: source.messages.map((m) => ({
          role: m.role,
          content: m.content,
          provider: m.provider,
          model: m.model,
        })),
      },
    },
  });

  return NextResponse.json({ conversationId: forked.id });
}
