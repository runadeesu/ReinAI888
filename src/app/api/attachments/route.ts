import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { saveFile } from "@/lib/files/storage";
import { extractText, isSupportedMimeType } from "@/lib/files/parse";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const conversationId = formData?.get("conversationId") as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "ファイルサイズは25MB以下にしてください" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!isSupportedMimeType(mimeType)) {
    return NextResponse.json({ error: "サポートされていないファイル形式です" }, { status: 400 });
  }

  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = await saveFile(userId, file.name, buffer);

  let extractedText: string | null = null;
  try {
    extractedText = await extractText(file.name, mimeType, buffer);
  } catch (error) {
    console.error("[ReinAI attachment parse error]", error);
  }

  const attachment = await prisma.attachment.create({
    data: {
      userId,
      conversationId: conversationId || null,
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
      storagePath,
      extractedText,
    },
  });

  return NextResponse.json({
    attachment: {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      hasExtractedText: Boolean(attachment.extractedText),
    },
  });
}
