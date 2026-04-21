import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import type { OrderStatus } from "@/generated/prisma";
import { calculateShipping, calculateTax } from "@/lib/utils";

const schema = z.object({
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
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { address, items } = parsed.data;

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

  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const stripeOn = stripeConfigured();
  const initialStatus: OrderStatus = stripeOn ? "PENDING" : "PAID";

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

  if (stripeOn) {
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

  return NextResponse.json({ id: order.id });
}
