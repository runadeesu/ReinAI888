"use client";

import { useState } from "react";
import { User, Bot, Paperclip, Copy, Check, Pencil, RotateCw } from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const INLINE_VIDEO_TYPES = new Set(["video/mp4"]);

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { id: string; fileName: string; mimeType?: string }[];
  pending?: boolean;
  onEdit?: (id: string, newContent: string) => void;
  onRegenerate?: (id: string) => void;
  editDisabled?: boolean;
}

export function MessageBubble({
  id,
  role,
  content,
  attachments,
  pending,
  onEdit,
  onRegenerate,
  editDisabled,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleEditStart() {
    setDraft(content);
    setEditing(true);
  }

  function handleEditSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === content) {
      setEditing(false);
      return;
    }
    onEdit?.(id, trimmed);
    setEditing(false);
  }

  return (
    <div className={`group flex gap-3 py-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] border border-[var(--border)]"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`min-w-0 max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {attachments && attachments.some((a) => a.mimeType && INLINE_IMAGE_TYPES.has(a.mimeType)) && (
          <div className="mb-1.5 flex flex-wrap gap-2">
            {attachments
              .filter((a) => a.mimeType && INLINE_IMAGE_TYPES.has(a.mimeType))
              .map((a) => (
                <a key={a.id} href={`/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/attachments/${a.id}`}
                    alt={a.fileName}
                    className="max-h-80 max-w-full rounded-xl border border-[var(--border)] object-contain"
                  />
                </a>
              ))}
          </div>
        )}

        {attachments && attachments.some((a) => a.mimeType && INLINE_VIDEO_TYPES.has(a.mimeType)) && (
          <div className="mb-1.5 flex flex-wrap gap-2">
            {attachments
              .filter((a) => a.mimeType && INLINE_VIDEO_TYPES.has(a.mimeType))
              .map((a) => (
                <video
                  key={a.id}
                  src={`/api/attachments/${a.id}`}
                  controls
                  className="max-h-80 max-w-full rounded-xl border border-[var(--border)]"
                />
              ))}
          </div>
        )}

        {attachments &&
          attachments.some(
            (a) => !a.mimeType || (!INLINE_IMAGE_TYPES.has(a.mimeType) && !INLINE_VIDEO_TYPES.has(a.mimeType))
          ) && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {attachments
                .filter(
                  (a) => !a.mimeType || (!INLINE_IMAGE_TYPES.has(a.mimeType) && !INLINE_VIDEO_TYPES.has(a.mimeType))
                )
                .map((a) => (
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

        {editing ? (
          <div className="w-full min-w-[16rem]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSave();
                }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            <div className="mt-1.5 flex justify-end gap-1.5">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-2.5 py-1 text-xs hover:bg-[var(--surface-hover)]"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditSave}
                disabled={!draft.trim()}
                className="rounded-lg bg-[var(--primary)] px-2.5 py-1 text-xs text-white hover:bg-[var(--primary-hover)] disabled:opacity-40"
              >
                送信して再生成
              </button>
            </div>
          </div>
        ) : (
          <>
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

            {isUser && content && !pending && (
              <div className="mt-1 flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  title="コピー"
                  className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
                {onEdit && (
                  <button
                    onClick={handleEditStart}
                    disabled={editDisabled}
                    title="編集"
                    className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}

            {!isUser && content && !pending && (
              <div className="mt-1 flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  title="コピー"
                  className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(id)}
                    disabled={editDisabled}
                    title="再生成"
                    className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
                  >
                    <RotateCw size={13} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
