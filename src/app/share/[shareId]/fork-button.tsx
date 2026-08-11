"use client";

import { useState } from "react";
import { GitFork, Loader2 } from "lucide-react";

export function ForkButton({ shareId }: { shareId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFork() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/share/${shareId}/fork`, { method: "POST" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json().catch(() => ({ error: "フォークに失敗しました" }));
    if (!res.ok) {
      setError(data.error ?? "フォークに失敗しました");
      setLoading(false);
      return;
    }
    window.location.href = `/chat/${data.conversationId}`;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleFork}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <GitFork size={14} />}
        自分の会話としてフォーク
      </button>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
