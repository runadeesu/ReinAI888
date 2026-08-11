"use client";

import { useEffect, useState } from "react";

interface StatsData {
  conversationCount: number;
  totalMessages: number;
  totalTokens: number;
  modelBreakdown: { model: string; count: number }[];
  weeklyActivity: { weekStart: string; count: number }[];
}

interface RateLimitStatus {
  label: string;
  windowLabel: string;
  limit: number;
  remaining: number;
  resetAt: number;
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitStatus[] | null>(null);

  useEffect(() => {
    fetch("/api/account/stats")
      .then((r) => r.json())
      .then(setData);
    fetch("/api/account/rate-limit-status")
      .then((r) => r.json())
      .then((d) => setRateLimits(d.status ?? []));
  }, []);

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">読み込み中...</p>;
  }

  const maxWeekly = Math.max(1, ...data.weeklyActivity.map((w) => w.count));
  const maxModel = Math.max(1, ...data.modelBreakdown.map((m) => m.count));

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">利用統計</h2>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="会話数" value={data.conversationCount.toLocaleString()} />
        <StatCard label="メッセージ数" value={data.totalMessages.toLocaleString()} />
        <StatCard label="トークン使用量 (直近8週)" value={data.totalTokens.toLocaleString()} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">週別メッセージ数(直近8週間)</p>
        <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] p-4" style={{ height: 140 }}>
          {data.weeklyActivity.map((w) => (
            <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[var(--primary)]"
                style={{ height: `${Math.max(4, (w.count / maxWeekly) * 100)}px` }}
                title={`${w.count}件`}
              />
              <span className="text-[10px] text-[var(--muted)]">
                {new Date(w.weekStart).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">モデル別使用回数(直近8週間・応答ベース)</p>
        {data.modelBreakdown.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">データがありません</p>
        ) : (
          <div className="space-y-2">
            {data.modelBreakdown.map((m) => (
              <div key={m.model} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs">{m.model}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${(m.count / maxModel) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-[var(--muted)]">{m.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {rateLimits && rateLimits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted)]">現在のレート制限状況</p>
          <div className="space-y-2">
            {rateLimits.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs">{r.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${(r.remaining / r.limit) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-[var(--muted)]">
                  残り{r.remaining}/{r.limit}({r.windowLabel})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
