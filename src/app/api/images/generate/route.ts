import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { resolveApiKey } from "@/lib/ai/resolve-key";
import { generateChatImage } from "@/lib/ai/image-gen";
import { generateImageSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit/limiter";
import { saveFile } from "@/lib/files/storage";

export const maxDuration = 120;

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const limited = rateLimit(`image-gen:${userId}`, 10, 60 * 1000);
  if (!limited.success) {
    return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateImageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }
  const { conversationId, prompt } = parsed.data;

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  const [openaiKey, googleKey, openrouterKey] = await Promise.all([
    resolveApiKey(userId, "openai"),
    resolveApiKey(userId, "google"),
    resolveApiKey(userId, "openrouter"),
  ]);

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

  let result;
  try {
    result = await generateChatImage({ prompt, openaiKey, googleKey, openrouterKey });
  } catch (err) {
    console.error("[ReinAI image generation error]", err);
    const message = err instanceof Error ? err.message : "画像生成に失敗しました";
    return NextResponse.json({ error: message, userMessageId: userMessage.id }, { status: 502 });
  }

  const buffer = Buffer.from(result.base64, "base64");
  const extension = result.mimeType.split("/")[1]?.split("+")[0] ?? "png";
  const fileName = `generated-${Date.now()}.${extension}`;
  const storagePath = await saveFile(userId, fileName, buffer);

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: `画像を生成しました。(${result.providerLabel})`,
      provider: "image-gen",
    },
  });

  const attachment = await prisma.attachment.create({
    data: {
      userId,
      conversationId,
      messageId: assistantMessage.id,
      fileName,
      mimeType: result.mimeType,
      sizeBytes: buffer.byteLength,
      storagePath,
    },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  return NextResponse.json({
    userMessageId: userMessage.id,
    assistantMessage: {
      id: assistantMessage.id,
      role: "assistant",
      content: assistantMessage.content,
      provider: assistantMessage.provider,
      model: null,
      createdAt: assistantMessage.createdAt,
      attachments: [
        {
          id: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        },
      ],
    },
  });
}
