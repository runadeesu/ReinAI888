import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { ReinAILogo } from "@/components/brand/logo";
import { User, Bot, Paperclip } from "lucide-react";

export default async function SharedConversationPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { shareId },
    select: {
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          attachments: { select: { id: true, fileName: true } },
        },
      },
    },
  });

  if (!conversation) notFound();

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
        <ReinAILogo size={20} />
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold">{conversation.title}</h1>
        <p className="mb-6 text-xs text-[var(--muted)]">
          この会話はReinAIで公開共有されています。読み取り専用です。
        </p>

        {conversation.messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex gap-3 py-4 ${isUser ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isUser ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`min-w-0 max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                {m.attachments.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {m.attachments.map((a) => (
                      <span
                        key={a.id}
                        className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                      >
                        <Paperclip size={11} />
                        {a.fileName}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isUser ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--background)]"
                  }`}
                >
                  {isUser ? <p className="whitespace-pre-wrap">{m.content}</p> : <MarkdownRenderer content={m.content} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
