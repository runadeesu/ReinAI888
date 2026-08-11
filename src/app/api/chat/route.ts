import { streamText, generateText, stepCountIs, type ModelMessage } from "ai";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getLanguageModel } from "@/lib/ai/client";
import { resolveApiKey } from "@/lib/ai/resolve-key";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { wikipediaSearchTool } from "@/lib/ai/tools/wikipedia-search";
import type { AiProviderId } from "@/lib/ai/models";
import { sendMessageSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit/limiter";

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

  const { conversationId, content, attachmentIds, editMessageId, regenerateMessageId, useSearch } = parsed.data;

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

  let priorMessages;
  let userMessage: { id: string } | null = null;

  if (regenerateMessageId) {
    const target = await prisma.message.findUnique({ where: { id: regenerateMessageId } });
    if (!target || target.conversationId !== conversationId || target.role !== "assistant") {
      return new Response(JSON.stringify({ error: "再生成対象のメッセージが見つかりません" }), { status: 404 });
    }

    priorMessages = await prisma.message.findMany({
      where: { conversationId, createdAt: { lt: target.createdAt } },
      orderBy: { createdAt: "asc" },
    });

    // Regenerating drops the old reply and anything that came after it.
    await prisma.message.deleteMany({
      where: { conversationId, createdAt: { gte: target.createdAt } },
    });
  } else if (editMessageId) {
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
      data: { content: content! },
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
        content: content!,
        ...(attachmentIds && attachmentIds.length > 0
          ? { attachments: { connect: attachmentIds.map((id) => ({ id })) } }
          : {}),
      },
    });
  }

  const isFirstMessage = priorMessages.length === 0 && !regenerateMessageId;

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

  const model = getLanguageModel(provider, conversation.model, apiKey);

  if (isFirstMessage && content) {
    const title = content.trim().slice(0, 60) || "New chat";
    await prisma.conversation.update({ where: { id: conversationId }, data: { title } });

    // Best-effort upgrade to a real summary title once the model responds —
    // fire-and-forget so it never delays the user's first reply.
    generateText({
      model,
      prompt: `次のメッセージの内容を表す、10〜20文字程度の短いタイトルを1行だけ日本語で出力してください。タイトル以外の説明・記号・引用符は付けないでください。\n\nメッセージ:\n${content.slice(0, 2000)}`,
    })
      .then(({ text }) => {
        const better = text.trim().replace(/^["'「』]|["'」』]$/g, "").slice(0, 60);
        if (better) return prisma.conversation.update({ where: { id: conversationId }, data: { title: better } });
      })
      .catch(() => {});
  }

  const historyMessages: ModelMessage[] = priorMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const modelMessages: ModelMessage[] = regenerateMessageId
    ? historyMessages
    : [...historyMessages, { role: "user" as const, content: content! + attachmentContext }];

  const [user, project] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { customInstructions: true } }),
    conversation.projectId
      ? prisma.project.findUnique({ where: { id: conversation.projectId }, select: { customInstructions: true } })
      : Promise.resolve(null),
  ]);
  const effectiveInstructions =
    project?.customInstructions && project.customInstructions.trim().length > 0
      ? project.customInstructions
      : user?.customInstructions;

  const result = streamText({
    model,
    system: buildSystemPrompt(conversation.systemPrompt, effectiveInstructions),
    messages: modelMessages,
    ...(useSearch ? { tools: { search_wikipedia: wikipediaSearchTool }, stopWhen: stepCountIs(5) } : {}),
    abortSignal: request.signal,
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
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            // client already disconnected; keep accumulating so the partial
            // reply can still be persisted below.
          }
        }
      } catch (err) {
        // Client-initiated stop (via AbortController) surfaces here the same
        // way a provider failure would — request.signal.aborted tells them
        // apart so we only show an error notice for genuine failures.
        const aborted = request.signal.aborted;
        console.error(aborted ? "[ReinAI chat stream stopped by client]" : "[ReinAI chat stream error]", err);
        const notice = aborted ? "" : "\n\n[エラー: 応答の生成中に問題が発生しました。もう一度お試しください]";
        if (notice) {
          try {
            controller.enqueue(encoder.encode(notice));
          } catch {}
        }
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
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...(userMessage ? { "X-User-Message-Id": userMessage.id } : {}),
    },
  });
}
