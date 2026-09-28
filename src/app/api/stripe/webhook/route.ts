import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { transitionOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const cs = event.data.object as Stripe.Checkout.Session;
    const orderId = cs.metadata?.orderId;
    if (orderId && cs.payment_status === "paid") {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      const paid = (cs.amount_total ?? 0) / 100;
      if (!order) {
        console.warn(`Stripe webhook: order ${orderId} not found`);
      } else if (order.stripeId !== cs.id || Math.abs(paid - Number(order.total)) > 0.01) {
        console.error("Stripe webhook: session does not match order", {
          orderId,
          session: cs.id,
          paid,
          expected: order.total.toString(),
        });
      } else {
        const ok = await transitionOrder({
          orderId,
          from: "PENDING",
          to: "PAID",
          note: "Paid by card",
        });
        if (!ok && order.status !== "PAID") {
          console.error("Stripe payment completed for a non-pending order", orderId);
          await prisma.orderEvent.create({
            data: {
              orderId,
              status: order.status,
              note: `Card payment ${cs.payment_intent ?? cs.id} received after the order was closed — refund needed`,
            },
          });
        }
      }
    }
  } else if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const cs = event.data.object as Stripe.Checkout.Session;
    const orderId = cs.metadata?.orderId;
    if (orderId) {
      await transitionOrder({
        orderId,
        from: "PENDING",
        to: "CANCELLED",
        note: "Card payment not completed",
      });
    }
  }

  return NextResponse.json({ received: true });
}
