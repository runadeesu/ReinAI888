"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  message: string;
  active: boolean;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements ?? []));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!message.trim()) return;
    setCreating(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    setCreating(false);
    if (res.ok) {
      setMessage("");
      load();
    }
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("このお知らせを削除しますか?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">お知らせ</h2>
        <p className="mt-1 text-sm text-white/50">
          有効(表示中)にしたお知らせのうち最新の1件が、ReinAI本体のすべてのユーザーにバナー表示されます。
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs text-white/50">新規お知らせ</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="例: 8/15 2:00-3:00にメンテナンスを予定しています"
          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !message.trim()}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15 disabled:opacity-50"
        >
          {creating ? "作成中..." : "作成(有効化して表示)"}
        </button>
      </div>

      <div className="space-y-2">
        {announcements.length === 0 && <p className="text-sm text-white/40">お知らせはまだありません</p>}
        {announcements.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-sm text-white/80">{a.message}</p>
              <p className="mt-1 text-xs text-white/40">{new Date(a.createdAt).toLocaleString("ja-JP")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={
                  a.active
                    ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
                    : "rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50"
                }
              >
                {a.active ? "表示中" : "非表示"}
              </span>
              <button
                onClick={() => handleToggle(a.id, a.active)}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
              >
                {a.active ? "非表示にする" : "表示する"}
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
