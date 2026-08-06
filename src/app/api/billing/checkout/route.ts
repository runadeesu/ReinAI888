import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";
import { PLANS, type PlanId } from "@/lib/billing/plans";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "決済機能は現在準備中です。しばらくしてから再度お試しください。" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const planId = body.plan as PlanId;
  if (planId !== "PRO" && planId !== "MASTER") {
    return NextResponse.json({ error: "無効なプランです" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const plan = PLANS[planId];
  const origin = request.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: { name: `ReinAI ${plan.label}プラン` },
          unit_amount: plan.priceJpy,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/settings/billing?success=1`,
    cancel_url: `${origin}/settings/billing?canceled=1`,
    metadata: { userId, plan: planId },
    subscription_data: { metadata: { userId, plan: planId } },
  });

  return NextResponse.json({ url: session.url });
}
