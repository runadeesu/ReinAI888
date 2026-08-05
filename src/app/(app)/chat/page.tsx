"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";

export default function NewChatPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!value.trim() || loading) return;
    setLoading(true);

    const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    const conversationId = data.conversation.id;

    sessionStorage.setItem(`reinai-draft-${conversationId}`, value.trim());
    router.push(`/chat/${conversationId}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-2xl font-bold">ReinAIに何を作ってもらいますか？</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          コード生成、バグ修正、リファクタリング、アーキテクチャ設計など、なんでも聞いてください。
        </p>
        <div className="mt-6 flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleStart();
              }
            }}
            rows={2}
            autoFocus
            placeholder="例: Next.jsでTODOアプリを作って"
            className="max-h-40 flex-1 resize-none bg-transparent p-2 text-sm outline-none"
          />
          <button
            onClick={handleStart}
            disabled={loading || !value.trim()}
            className="shrink-0 rounded-lg bg-[var(--primary)] p-2.5 text-white hover:bg-[var(--primary-hover)] disabled:opacity-40"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
