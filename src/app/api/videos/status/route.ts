import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { resolveApiKey } from "@/lib/ai/resolve-key";
import { checkVideoGeneration } from "@/lib/ai/video-gen";
import { videoStatusSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit/limiter";
import { saveFile } from "@/lib/files/storage";

export const maxDuration = 60;

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const limited = rateLimit(`video-status:${userId}`, 60, 60 * 1000);
  if (!limited.success) {
    return NextResponse.json({ error: "リクエストが多すぎます" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = videoStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }
  const { conversationId, operationName } = parsed.data;

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  const googleKey = await resolveApiKey(userId, "google");
  if (!googleKey) {
    return NextResponse.json({ error: "Google APIキーが見つかりません" }, { status: 400 });
  }

  let status;
  try {
    status = await checkVideoGeneration(operationName, googleKey);
  } catch (err) {
    console.error("[ReinAI video generation status error]", err);
    const message = err instanceof Error ? err.message : "動画生成の状態確認に失敗しました";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!status.done) {
    return NextResponse.json({ done: false });
  }

  if (status.error || !status.videoBuffer) {
    return NextResponse.json({ done: true, error: status.error ?? "動画生成に失敗しました" });
  }

  const fileName = `generated-${Date.now()}.mp4`;
  const storagePath = await saveFile(userId, fileName, status.videoBuffer);

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: "動画を生成しました。(Google Veo 3.1)",
      provider: "video-gen",
    },
  });

  const attachment = await prisma.attachment.create({
    data: {
      userId,
      conversationId,
      messageId: assistantMessage.id,
      fileName,
      mimeType: status.mimeType ?? "video/mp4",
      sizeBytes: status.videoBuffer.byteLength,
      storagePath,
    },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  return NextResponse.json({
    done: true,
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
