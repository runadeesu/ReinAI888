import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getPlan } from "@/lib/billing/plans";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, plan: true, dailyTokensUsed: true, dailyTokensResetAt: true, stripeSubscriptionId: true },
  });
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isUnlimited = user.role === "admin";
  const used = isUnlimited ? 0 : user.dailyTokensResetAt < today ? 0 : user.dailyTokensUsed;
  const plan = getPlan(user.plan);

  return NextResponse.json({
    role: user.role,
    plan: plan.id,
    isUnlimited,
    hasSubscription: Boolean(user.stripeSubscriptionId),
    dailyTokensUsed: used,
    dailyTokenLimit: plan.dailyFreeProviderTokens,
  });
}
