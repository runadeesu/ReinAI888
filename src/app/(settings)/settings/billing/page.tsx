"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils/cn";

interface PlanStatus {
  role: string;
  plan: PlanId;
  isUnlimited: boolean;
  hasSubscription: boolean;
  dailyTokensUsed: number;
  dailyTokenLimit: number;
}

export default function BillingPage() {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/plan")
      .then((r) => r.json())
      .then((d) => setStatus(d));
  }, []);

  async function handleUpgrade(planId: PlanId) {
    setError(null);
    setLoadingPlan(planId);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setError(data.error ?? "エラーが発生しました");
      setLoadingPlan(null);
      return;
    }
    window.location.href = data.url;
  }

  async function handleManage() {
    setError(null);
    setPortalLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setError(data.error ?? "エラーが発生しました");
      setPortalLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  const usagePct = status && status.dailyTokenLimit > 0
    ? Math.min(100, Math.round((status.dailyTokensUsed / status.dailyTokenLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">プラン・お支払い</h2>

      {status && (
        <div className="rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">現在のプラン</p>
              <p className="flex items-center gap-1.5 text-lg font-semibold">
                {status.role === "admin" && <Crown size={16} className="text-yellow-500" />}
                {PLANS[status.plan]?.label ?? status.plan}
                {status.isUnlimited && (
                  <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-normal text-yellow-600">
                    無制限
                  </span>
                )}
              </p>
            </div>
            {status.hasSubscription && (
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                {portalLoading ? <Loader2 size={14} className="animate-spin" /> : "お支払い管理"}
              </button>
            )}
          </div>

          {!status.isUnlimited && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>無料モデル(NVIDIA / OpenRouter)の本日の利用量</span>
                <span>
                  {status.dailyTokensUsed.toLocaleString()} / {status.dailyTokenLimit.toLocaleString()} トークン
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                ご自身のAPIキーを登録した場合、そのプロバイダーは常に無制限です。
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = status?.plan === plan.id && !status.isUnlimited;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-xl border p-4",
                isCurrent ? "border-[var(--primary)]" : "border-[var(--border)]"
              )}
            >
              <p className="text-sm font-semibold text-[var(--muted)]">{plan.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {plan.priceJpy === 0 ? "¥0" : `¥${plan.priceJpy.toLocaleString()}`}
                <span className="text-sm font-normal text-[var(--muted)]">/月</span>
              </p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-[var(--muted)]">
                    <Check size={13} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.id === "FREE" ? (
                <div className="mt-4 rounded-lg px-3 py-1.5 text-center text-sm text-[var(--muted)]">
                  {isCurrent ? "現在のプラン" : "デフォルト"}
                </div>
              ) : isCurrent ? (
                <div className="mt-4 rounded-lg border border-[var(--primary)] px-3 py-1.5 text-center text-sm font-medium text-[var(--primary)]">
                  現在のプラン
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loadingPlan !== null}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {loadingPlan === plan.id ? <Loader2 size={14} className="animate-spin" /> : `${plan.label}にアップグレード`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
