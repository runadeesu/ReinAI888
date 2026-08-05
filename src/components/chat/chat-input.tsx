"use client";

import { useRef, useState, type DragEvent } from "react";
import { Paperclip, Send, X, Loader2 } from "lucide-react";

export interface PendingAttachment {
  id: string;
  fileName: string;
}

interface ChatInputProps {
  conversationId: string;
  disabled?: boolean;
  onSend: (content: string, attachmentIds: string[]) => void;
}

export function ChatInput({ conversationId, disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);
      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAttachments((prev) => [...prev, { id: data.attachment.id, fileName: data.attachment.fileName }]);
      }
    }
    setUploading(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }

  function handleSubmit() {
    if (!value.trim() && attachments.length === 0) return;
    onSend(value.trim(), attachments.map((a) => a.id));
    setValue("");
    setAttachments([]);
  }

  return (
    <div
      className={`border-t border-[var(--border)] bg-[var(--background)] p-4 ${dragging ? "bg-[var(--surface)]" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            >
              <Paperclip size={11} />
              {a.fileName}
              <button onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-lg p-2 hover:bg-[var(--surface-hover)]"
          title="ファイルを添付"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={1}
          placeholder="メッセージを入力... (Shift+Enterで改行)"
          className="max-h-40 min-h-[2.25rem] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          className="shrink-0 rounded-lg bg-[var(--primary)] p-2 text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
