"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  isSuspended: boolean;
}

type Mode = "all" | "selected";

export default function BroadcastPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetch(`/api/users/list?q=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []));
    }, 200);
    return () => clearTimeout(timeout);
  }, [search]);

  function toggleUser(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const recipientCount = mode === "all" ? null : selected.size;

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return;
    if (mode === "selected" && selected.size === 0) {
      setError("送信先ユーザーを選択してください");
      return;
    }

    const confirmText =
      mode === "all"
        ? "登録ユーザー全員にメールを送信しますか?"
        : `選択した${selected.size}人にメールを送信しますか?`;
    if (!confirm(confirmText)) return;

    setSending(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/broadcast-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subject.trim(),
        message: message.trim(),
        userIds: mode === "selected" ? [...selected] : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);

    if (res.ok) {
      setResult(data);
    } else {
      setError(data.error ?? "送信に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">メール送信</h2>
        <p className="mt-1 text-sm text-white/50">
          登録ユーザー全員、または選択したユーザーにメールを一斉送信します。
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2 text-white/80">
            <input type="radio" checked={mode === "all"} onChange={() => setMode("all")} />
            登録ユーザー全員
          </label>
          <label className="flex items-center gap-2 text-white/80">
            <input type="radio" checked={mode === "selected"} onChange={() => setMode("selected")} />
            ユーザーを選択({selected.size}人選択中)
          </label>
        </div>

        {mode === "selected" && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="メール・名前で検索"
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10">
              {users.length === 0 && <p className="p-3 text-sm text-white/40">該当するユーザーがいません</p>}
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-white/5 px-3 py-1.5 text-sm last:border-0 hover:bg-white/[0.03]"
                >
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleUser(u.id)} />
                  <span className="text-white/80">{u.email}</span>
                  <span className="text-white/40">{u.name ?? ""}</span>
                  {u.isSuspended && (
                    <span className="ml-auto rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">停止中</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="件名"
          maxLength={200}
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          maxLength={5000}
          placeholder="本文(プレーンテキスト。改行はそのまま反映されます)"
          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            {recipientCount === null ? "登録ユーザー全員に送信されます" : `${recipientCount}人に送信されます`}
          </p>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="rounded-lg bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/15 disabled:opacity-50"
          >
            {sending ? "送信中..." : "送信する"}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {result && (
          <p className="text-sm text-emerald-400">
            送信完了: {result.sent}/{result.total}件成功{result.failed > 0 ? `(${result.failed}件失敗)` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
