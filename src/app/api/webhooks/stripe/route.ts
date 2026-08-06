import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[ReinAI stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        await prisma.user
          .update({
            where: { id: userId },
            data: {
              plan,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
              stripeSubscriptionId:
                typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
            },
          })
          .catch(() => {});
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const plan = subscription.metadata?.plan;
      if (userId && plan && subscription.status === "active") {
        await prisma.user.update({ where: { id: userId }, data: { plan } }).catch(() => {});
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } }).catch(() => {});
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
