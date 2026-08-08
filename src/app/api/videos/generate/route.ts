import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { resolveApiKey } from "@/lib/ai/resolve-key";
import { startVideoGeneration } from "@/lib/ai/video-gen";
import { generateVideoSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit/limiter";

export const maxDuration = 30;

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const limited = rateLimit(`video-gen:${userId}`, 5, 60 * 60 * 1000);
  if (!limited.success) {
    return NextResponse.json({ error: "動画生成の回数上限に達しました。しばらく待ってから再試行してください。" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateVideoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }
  const { conversationId, prompt } = parsed.data;

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  const googleKey = await resolveApiKey(userId, "google");
  if (!googleKey) {
    return NextResponse.json(
      { error: "動画生成にはGoogle(Veo)のAPIキーが必要です。設定 > APIキー から登録してください。" },
      { status: 400 }
    );
  }

  const isFirstMessage = (await prisma.message.count({ where: { conversationId } })) === 0;

  const userMessage = await prisma.message.create({
    data: { conversationId, role: "user", content: prompt },
  });

  if (isFirstMessage) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: prompt.trim().slice(0, 60) || "New chat" },
    });
  }

  let operationName: string;
  try {
    operationName = await startVideoGeneration(prompt, googleKey);
  } catch (err) {
    console.error("[ReinAI video generation start error]", err);
    const message = err instanceof Error ? err.message : "動画生成の開始に失敗しました";
    return NextResponse.json({ error: message, userMessageId: userMessage.id }, { status: 502 });
  }

  return NextResponse.json({ userMessageId: userMessage.id, operationName });
}
