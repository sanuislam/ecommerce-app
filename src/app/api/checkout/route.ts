import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { bkashConfigured, createBkashPayment } from "@/lib/bkash";
import type { OrderStatus, PaymentMethod } from "@/generated/prisma";
import { calculateShipping, calculateTax } from "@/lib/utils";

const paymentMethodSchema = z.enum([
  "STRIPE",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "UPAY",
  "COD",
]);

const schema = z
  .object({
    address: z.object({
      fullName: z.string().min(1),
      phone: z.string().optional().default(""),
      line1: z.string().min(1),
      line2: z.string().optional().default(""),
      city: z.string().min(1),
      state: z.string().optional().default(""),
      postalCode: z.string().min(1),
      country: z.string().min(1),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
    paymentMethod: paymentMethodSchema.default("STRIPE"),
    paymentSenderNumber: z.string().optional().default(""),
    paymentTransactionId: z.string().optional().default(""),
    shippingRegion: z.enum(["DHAKA", "OUTSIDE_DHAKA"]).default("OUTSIDE_DHAKA"),
  })
  .superRefine((v, ctx) => {
    // Manual MFS flow (Nagad/Rocket/Upay always; bKash only when live gateway not configured)
    const mfsManual: string[] = ["NAGAD", "ROCKET", "UPAY"];
    if (v.paymentMethod === "BKASH" && !bkashConfigured()) {
      mfsManual.push("BKASH");
    }
    if (mfsManual.includes(v.paymentMethod)) {
      if (!v.paymentSenderNumber.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentSenderNumber"],
          message: "Sender mobile number is required",
        });
      }
      if (!v.paymentTransactionId.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentTransactionId"],
          message: "Transaction ID is required",
        });
      }
    }
  });

class StockError extends Error {
  constructor(public productName: string) {
    super(`Insufficient stock for ${productName}`);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const {
    address,
    items,
    paymentMethod,
    paymentSenderNumber,
    paymentTransactionId,
    shippingRegion,
  } = parsed.data;

  const products = await prisma.product.findMany({
    where: {
      id: { in: items.map((i) => i.productId) },
      published: true,
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const missing = items.find((i) => !byId.has(i.productId));
  if (missing) {
    return NextResponse.json(
      { error: "One or more products are no longer available" },
      { status: 400 },
    );
  }

  for (const i of items) {
    const p = byId.get(i.productId)!;
    if (p.stock < i.quantity) {
      return NextResponse.json(
        {
          error: `Only ${p.stock} of "${p.name}" left in stock`,
        },
        { status: 400 },
      );
    }
  }

  let subtotal = 0;
  const orderItems = items.map((i) => {
    const p = byId.get(i.productId)!;
    const price = Number(p.price);
    subtotal += price * i.quantity;
    return {
      productId: p.id,
      name: p.name,
      price,
      quantity: i.quantity,
      image: p.images[0] ?? null,
    };
  });

  const shipping = calculateShipping(subtotal, shippingRegion);
  const tax = calculateTax(subtotal);
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const stripeOn = stripeConfigured();
  const bkashOn = bkashConfigured();
  const useStripe = paymentMethod === "STRIPE" && stripeOn;
  const useBkash = paymentMethod === "BKASH" && bkashOn;

  const initialStatus: OrderStatus =
    paymentMethod === "STRIPE"
      ? stripeOn
        ? "PENDING"
        : "PAID"
      : "PENDING";

  const resolvedMethod: PaymentMethod =
    paymentMethod === "STRIPE" && !stripeOn ? "STRIPE" : paymentMethod;

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      for (const i of items) {
        const res = await tx.product.updateMany({
          where: { id: i.productId, stock: { gte: i.quantity } },
          data: { stock: { decrement: i.quantity } },
        });
        if (res.count !== 1) {
          throw new StockError(byId.get(i.productId)!.name);
        }
      }

      const addressRecord = await tx.address.create({
        data: {
          userId: session.user.id,
          fullName: address.fullName,
          phone: address.phone || null,
          line1: address.line1,
          line2: address.line2 || null,
          city: address.city,
          state: address.state || null,
          postalCode: address.postalCode,
          country: address.country,
        },
      });

      return tx.order.create({
        data: {
          userId: session.user.id,
          status: initialStatus,
          subtotal,
          tax,
          shipping,
          total,
          currency: "BDT",
          paymentEmail: session.user.email,
          paymentMethod: resolvedMethod,
          paymentSenderNumber: paymentSenderNumber.trim() || null,
          paymentTransactionId: paymentTransactionId.trim() || null,
          addressId: addressRecord.id,
          items: { create: orderItems },
        },
      });
    });
  } catch (err) {
    if (err instanceof StockError) {
      return NextResponse.json(
        { error: `Ran out of stock for "${err.productName}". Try again.` },
        { status: 409 },
      );
    }
    throw err;
  }

  if (useStripe) {
    const stripe = getStripe();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${base}/orders/${order.id}?success=1`,
        cancel_url: `${base}/cart`,
        customer_email: session.user.email ?? undefined,
        line_items: [
          ...orderItems.map((i) => ({
            quantity: i.quantity,
            price_data: {
              currency: "bdt",
              unit_amount: Math.round(i.price * 100),
              product_data: { name: i.name },
            },
          })),
          ...(shipping > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: "bdt",
                    unit_amount: Math.round(shipping * 100),
                    product_data: { name: "Shipping" },
                  },
                },
              ]
            : []),
          ...(tax > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: "bdt",
                    unit_amount: Math.round(tax * 100),
                    product_data: { name: "Tax" },
                  },
                },
              ]
            : []),
        ],
        metadata: { orderId: order.id },
      });
    } catch (err) {
      console.error("Stripe checkout session failed, rolling back order", err);
      try {
        await prisma.$transaction(async (tx) => {
          for (const i of items) {
            await tx.product.update({
              where: { id: i.productId },
              data: { stock: { increment: i.quantity } },
            });
          }
          await tx.order.delete({ where: { id: order.id } });
          if (order.addressId) {
            await tx.address.delete({ where: { id: order.addressId } });
          }
        });
      } catch (rollbackErr) {
        console.error("Failed to rollback order after Stripe error", rollbackErr);
      }
      return NextResponse.json(
        { error: "Payment provider is unavailable. Please try again." },
        { status: 502 },
      );
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeId: checkoutSession.id },
    });
    return NextResponse.json({ id: order.id, checkoutUrl: checkoutSession.url });
  }

  if (useBkash) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
      const created = await createBkashPayment({
        amount: total,
        invoiceNumber: order.id,
        payerReference: address.phone || session.user.email || order.id,
        callbackURL: `${base}/api/payments/bkash/callback?orderId=${order.id}`,
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { bkashPaymentId: created.paymentID },
      });
      return NextResponse.json({ id: order.id, checkoutUrl: created.bkashURL });
    } catch (err) {
      console.error("bKash create_payment failed, rolling back order", err);
      try {
        await prisma.$transaction(async (tx) => {
          for (const i of items) {
            await tx.product.update({
              where: { id: i.productId },
              data: { stock: { increment: i.quantity } },
            });
          }
          await tx.order.delete({ where: { id: order.id } });
          if (order.addressId) {
            await tx.address.delete({ where: { id: order.addressId } });
          }
        });
      } catch (rollbackErr) {
        console.error("Failed to rollback order after bKash error", rollbackErr);
      }
      return NextResponse.json(
        { error: "bKash payment is unavailable right now. Please try again." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ id: order.id });
}
