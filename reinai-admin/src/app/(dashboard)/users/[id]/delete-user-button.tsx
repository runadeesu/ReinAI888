"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/users");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({ error: "削除に失敗しました" }));
    setError(data.error ?? "削除に失敗しました");
    setDeleting(false);
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">{email} を削除しますか？元に戻せません</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-50"
          >
            {deleting ? "削除中..." : "削除する"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/15"
          >
            キャンセル
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
    >
      ユーザーを削除
    </button>
  );
}
