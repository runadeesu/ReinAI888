import { User, Bot, Paperclip } from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { id: string; fileName: string }[];
  pending?: boolean;
}

export function MessageBubble({ role, content, attachments, pending }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 py-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] border border-[var(--border)]"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`min-w-0 max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {attachments && attachments.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <a
                key={a.id}
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)]"
              >
                <Paperclip size={11} />
                {a.fileName}
              </a>
            ))}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] border border-[var(--border)]"
          }`}
        >
          {content ? (
            isUser ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : (
              <MarkdownRenderer content={content} />
            )
          ) : pending ? (
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
