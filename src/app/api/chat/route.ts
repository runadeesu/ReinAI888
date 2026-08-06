import { streamText, type ModelMessage } from "ai";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getLanguageModel } from "@/lib/ai/client";
import { resolveApiKey, hasOwnKey } from "@/lib/ai/resolve-key";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import type { AiProviderId } from "@/lib/ai/models";
import { sendMessageSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit/limiter";
import { checkQuota, consumeQuota } from "@/lib/billing/quota";

// Server-provided free-tier providers whose usage is metered per plan when
// the request isn't using the user's own registered key for that provider.
const QUOTA_GATED_PROVIDERS = new Set(["nvidia", "openrouter"]);

// Some free-tier / large models take a while to finish generating; give the
// underlying function more room than Next's default before the platform
// would otherwise cut the connection.
export const maxDuration = 300;

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

  const { conversationId, content, attachmentIds, editMessageId } = parsed.data;

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

  // A user's own registered key is always unlimited; only server-provided
  // free-tier keys (NVIDIA / OpenRouter) are metered per plan.
  const usingServerKey = !(await hasOwnKey(userId, provider));
  const quotaGated = usingServerKey && QUOTA_GATED_PROVIDERS.has(provider);

  if (quotaGated) {
    const quota = await checkQuota(userId);
    if (!quota.ok) {
      return new Response(
        JSON.stringify({
          error: "本日の無料枠(トークン)を使い切りました。プランをアップグレードするか、設定 > APIキー からご自身のAPIキーを登録してください。",
        }),
        { status: 429 }
      );
    }
  }

  let priorMessages;
  let userMessage;

  if (editMessageId) {
    const target = await prisma.message.findUnique({ where: { id: editMessageId } });
    if (!target || target.conversationId !== conversationId || target.role !== "user") {
      return new Response(JSON.stringify({ error: "編集対象のメッセージが見つかりません" }), { status: 404 });
    }

    priorMessages = await prisma.message.findMany({
      where: { conversationId, createdAt: { lt: target.createdAt } },
      orderBy: { createdAt: "asc" },
    });

    // Editing a message invalidates everything that came after it.
    await prisma.message.deleteMany({
      where: { conversationId, createdAt: { gt: target.createdAt } },
    });

    userMessage = await prisma.message.update({
      where: { id: editMessageId },
      data: { content },
    });
  } else {
    priorMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content,
        ...(attachmentIds && attachmentIds.length > 0
          ? { attachments: { connect: attachmentIds.map((id) => ({ id })) } }
          : {}),
      },
    });
  }

  const isFirstMessage = priorMessages.length === 0;

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
      if (quotaGated) {
        const totalTokens = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
        await consumeQuota(userId, totalTokens);
      }
    },
    onError: ({ error }) => {
      console.error("[ReinAI chat stream error]", error);
    },
  });

  // Piping result.textStream manually (instead of toTextStreamResponse())
  // lets us catch a mid-generation provider error and surface it visibly to
  // the client — and save whatever text was produced before the failure —
  // instead of the response silently ending with no explanation.
  const encoder = new TextEncoder();
  let accumulated = "";
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          accumulated += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("[ReinAI chat stream aborted]", err);
        const notice = "\n\n[エラー: 応答の生成中に問題が発生しました。もう一度お試しください]";
        controller.enqueue(encoder.encode(notice));
        if (accumulated.trim().length > 0) {
          await prisma.message
            .create({
              data: {
                conversationId,
                role: "assistant",
                content: accumulated + notice,
                provider,
                model: conversation.model,
              },
            })
            .catch(() => {});
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-User-Message-Id": userMessage.id,
    },
  });
}
