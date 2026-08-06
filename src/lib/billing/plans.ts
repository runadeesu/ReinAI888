export type PlanId = "FREE" | "PRO" | "MASTER";

export interface PlanInfo {
  id: PlanId;
  label: string;
  priceJpy: number; // per month, 0 for Free
  /** Daily token budget for server-provided free-tier models (NVIDIA / OpenRouter). */
  dailyFreeProviderTokens: number;
  features: string[];
}

export const PLANS: Record<PlanId, PlanInfo> = {
  FREE: {
    id: "FREE",
    label: "Free",
    priceJpy: 0,
    dailyFreeProviderTokens: 20_000,
    features: [
      "無料モデル(NVIDIA NIM / OpenRouter)を1日20,000トークンまで",
      "ご自身のAPIキーを登録すれば、そのプロバイダーは無制限",
    ],
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    priceJpy: 980,
    dailyFreeProviderTokens: 300_000,
    features: [
      "無料モデルを1日300,000トークンまで",
      "ご自身のAPIキー登録で無制限（Freeと共通）",
      "優先サポート",
    ],
  },
  MASTER: {
    id: "MASTER",
    label: "Master",
    priceJpy: 2980,
    dailyFreeProviderTokens: 2_000_000,
    features: [
      "無料モデルを1日2,000,000トークンまで",
      "ご自身のAPIキー登録で無制限（Freeと共通）",
      "最優先サポート・新機能の先行アクセス",
    ],
  },
};

export function getPlan(planId: string): PlanInfo {
  return PLANS[planId as PlanId] ?? PLANS.FREE;
}
