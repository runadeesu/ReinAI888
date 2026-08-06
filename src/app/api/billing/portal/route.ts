import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "決済機能は現在準備中です" }, { status: 503 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "契約情報が見つかりません" }, { status: 404 });
  }

  const origin = request.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
