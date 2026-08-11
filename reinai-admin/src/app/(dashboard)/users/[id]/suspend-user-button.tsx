"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SuspendUserButton({ userId, isSuspended }: { userId: string; isSuspended: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (!isSuspended && !confirm("このユーザーを停止しますか?すべてのセッションが即座に終了します。")) return;
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSuspended: !isSuspended }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={
        isSuspended
          ? "shrink-0 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
          : "shrink-0 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
      }
    >
      {loading ? "処理中..." : isSuspended ? "停止を解除" : "ユーザーを停止"}
    </button>
  );
}
