import { streamText, type ModelMessage } from "ai";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getLanguageModel } from "@/lib/ai/client";
import { resolveApiKey } from "@/lib/ai/resolve-key";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import type { AiProviderId } from "@/lib/ai/models";
import { sendMessageSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit/limiter";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return new Response(JSON.stringify({ error: "認証が必要です" }), { status: 401 });

  const limited = rateLimit(`chat:${userId}`, 30, 60 * 1000);
  if (!limited.success) {
    return new Response(JSON.stringify({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }), {
      status: 429,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "入力が正しくありません" }), { status: 400 });
  }

  const { conversationId, content, attachmentIds } = parsed.data;

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.userId !== userId) {
    return new Response(JSON.stringify({ error: "会話が見つかりません" }), { status: 404 });
  }

  const provider = conversation.provider as AiProviderId;
  const apiKey = await resolveApiKey(userId, provider);
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: `${provider} のAPIキーが設定されていません。設定 > APIキー から登録してください。`,
      }),
      { status: 400 }
    );
  }

  const priorMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const isFirstMessage = priorMessages.length === 0;

  const userMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content,
      ...(attachmentIds && attachmentIds.length > 0
        ? { attachments: { connect: attachmentIds.map((id) => ({ id })) } }
        : {}),
    },
  });

  let attachmentContext = "";
  if (attachmentIds && attachmentIds.length > 0) {
    const attachments = await prisma.attachment.findMany({
      where: { id: { in: attachmentIds }, userId },
    });
    for (const att of attachments) {
      if (att.extractedText) {
        attachmentContext += `\n\n添付ファイル: ${att.fileName}\n\`\`\`\n${att.extractedText.slice(0, 20000)}\n\`\`\`\n`;
      }
    }
  }

  if (isFirstMessage) {
    const title = content.trim().slice(0, 60) || "New chat";
    await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
  }

  const modelMessages: ModelMessage[] = [
    ...priorMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: content + attachmentContext },
  ];

  const model = getLanguageModel(provider, conversation.model, apiKey);

  const result = streamText({
    model,
    system: buildSystemPrompt(conversation.systemPrompt),
    messages: modelMessages,
    onFinish: async ({ text, usage }) => {
      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: text,
          provider,
          model: conversation.model,
          promptTokens: usage?.inputTokens ?? null,
          completionTokens: usage?.outputTokens ?? null,
        },
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    },
    onError: ({ error }) => {
      console.error("[ReinAI chat stream error]", error);
    },
  });

  void userMessage;

  return result.toTextStreamResponse();
}
