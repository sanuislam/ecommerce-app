import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { bkashConfigured, createBkashPayment } from "@/lib/bkash";
import { createUpayPayment, upayConfigured } from "@/lib/upay";
import { buildQuote, MAX_LINES, MAX_QTY_PER_LINE } from "@/lib/checkout";
import { isDistrict, normalizeBdPhone } from "@/lib/districts";
import { transitionOrder } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { Prisma } from "@/generated/prisma";
import { siteUrl } from "@/lib/site-url";

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z.string().trim().min(1, "Phone number is required"),
  line1: z.string().trim().min(5, "Please enter your full address").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Please enter your area / thana").max(80),
  state: z.string().trim().refine(isDistrict, "Please choose your district"),
  postalCode: z.string().trim().max(10).optional().default(""),
});

const schema = z.object({
  addressId: z.string().optional(),
  address: addressSchema.optional(),
  saveAsDefault: z.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).nullable().optional(),
        quantity: z.number().int().positive().max(MAX_QTY_PER_LINE),
      }),
    )
    .min(1, "Your cart is empty")
    .max(MAX_LINES),
  paymentMethod: z.enum(["STRIPE", "BKASH", "UPAY", "COD"], {
    message: "Please choose a payment method",
  }),
  couponCode: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

class CheckoutError extends Error {}

const appBase = () => siteUrl();

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in to check out" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!(await rateLimit(`checkout:${userId}`, 10, 600))) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // ---- Address: a saved one, or a new one typed at checkout ----
  let savedAddressId: string | null = null;
  let district: string;
  let phone: string;
  if (input.addressId) {
    const saved = await prisma.address.findFirst({
      where: { id: input.addressId, userId, archived: false },
    });
    if (!saved) {
      return NextResponse.json({ error: "Saved address not found" }, { status: 400 });
    }
    savedAddressId = saved.id;
    district = saved.state ?? "";
    phone = saved.phone ?? "";
  } else if (input.address) {
    district = input.address.state;
    phone = input.address.phone;
  } else {
    return NextResponse.json({ error: "Please enter a delivery address" }, { status: 400 });
  }
  const normalizedPhone = normalizeBdPhone(phone);
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)" },
      { status: 400 },
    );
  }

  // ---- Payment method checks ----
  const method = input.paymentMethod;
  const stripeOn = stripeConfigured();
  const [bkashLive, upayLive] = await Promise.all([bkashConfigured(), upayConfigured()]);
  if (method === "STRIPE" && !stripeOn) {
    return NextResponse.json({ error: "Card payment is not available" }, { status: 400 });
  }
  // Only online gateways and cash on delivery: no manual "Send Money" + TrxID.
  if (method === "BKASH" && !bkashLive) {
    return NextResponse.json({ error: "bKash payment is not available right now" }, { status: 400 });
  }
  if (method === "UPAY" && !upayLive) {
    return NextResponse.json({ error: "Mobile banking payment is not available right now" }, { status: 400 });
  }

  // ---- Price everything on the server ----
  const quote = await buildQuote({
    items: input.items,
    district,
    couponCode: input.couponCode,
    userId,
  });
  if (quote.errors.length) {
    return NextResponse.json({ error: quote.errors[0], quote }, { status: 409 });
  }
  if (input.couponCode && quote.couponError) {
    return NextResponse.json({ error: quote.couponError, quote }, { status: 400 });
  }

  // ---- Create the order atomically (stock, coupon, address) ----
  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      for (const l of quote.lines) {
        if (l.variantId) {
          const v = await tx.productVariant.updateMany({
            where: { id: l.variantId, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (v.count !== 1) throw new CheckoutError(`"${l.name}" just sold out`);
          await tx.product.update({
            where: { id: l.productId },
            data: { stock: { decrement: l.quantity } },
          });
        } else {
          const p = await tx.product.updateMany({
            where: { id: l.productId, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (p.count !== 1) throw new CheckoutError(`"${l.name}" just sold out`);
        }
      }

      if (quote.coupon) {
        // Lock the coupon row so parallel checkouts can't all pass the
        // per-customer limit.
        const [locked] = await tx.$queryRaw<{ perUserLimit: number | null }[]>`
          SELECT "perUserLimit" FROM "Coupon" WHERE "id" = ${quote.coupon.id} FOR UPDATE`;
        if (locked?.perUserLimit != null) {
          const mine = await tx.order.count({
            where: { userId, couponId: quote.coupon.id, status: { not: "CANCELLED" } },
          });
          if (mine >= locked.perUserLimit) {
            throw new CheckoutError("You have already used this coupon");
          }
        }
        const used = await tx.$executeRaw`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE "id" = ${quote.coupon.id}
            AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (used !== 1) throw new CheckoutError("This coupon has been fully used");
      }

      let addressId = savedAddressId;
      if (!addressId && input.address) {
        const a = input.address;
        // Re-use an identical saved address instead of piling up duplicates.
        const same = await tx.address.findFirst({
          where: {
            userId,
            archived: false,
            fullName: a.fullName,
            phone: normalizedPhone,
            line1: a.line1,
            city: a.city,
            state: a.state,
          },
          select: { id: true },
        });
        if (same) {
          addressId = same.id;
          if (input.saveAsDefault) {
            await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
            await tx.address.update({ where: { id: same.id }, data: { isDefault: true } });
          }
        }
      }
      if (!addressId && input.address) {
        const a = input.address;
        const hasDefault = await tx.address.count({
          where: { userId, isDefault: true, archived: false },
        });
        const makeDefault = input.saveAsDefault || hasDefault === 0;
        if (makeDefault) {
          await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        const created = await tx.address.create({
          data: {
            userId,
            fullName: a.fullName,
            phone: normalizedPhone,
            line1: a.line1,
            line2: a.line2 || null,
            city: a.city,
            state: a.state,
            postalCode: a.postalCode || null,
            country: "BD",
            isDefault: makeDefault,
          },
        });
        addressId = created.id;
      }

      return tx.order.create({
        data: {
          userId,
          status: "PENDING",
          subtotal: quote.subtotal,
          discount: quote.discount,
          tax: 0,
          shipping: quote.shipping,
          total: quote.total,
          currency: "BDT",
          couponId: quote.coupon?.id ?? null,
          couponCode: quote.coupon?.code ?? null,
          shippingZone: quote.zone,
          paymentEmail: session.user.email,
          paymentMethod: method,
          notes: input.notes || null,
          addressId,
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              variantName: l.variantName,
              name: l.name,
              price: l.unitPrice,
              quantity: l.quantity,
              image: l.image,
            })),
          },
          events: { create: { status: "PENDING", note: "Order placed" } },
        },
      });
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Checkout failed", err.code, err.message);
      return NextResponse.json({ error: "Could not place order. Please try again." }, { status: 500 });
    }
    throw err;
  }

  const cancelUnpaid = (note: string) =>
    transitionOrder({ orderId: order.id, from: "PENDING", to: "CANCELLED", note });

  // ---- Online payments: hand off to the gateway ----
  if (method === "STRIPE") {
    try {
      const stripe = getStripe();
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${appBase()}/orders/${order.id}?success=1`,
        cancel_url: `${appBase()}/orders/${order.id}?payment=cancelled`,
        customer_email: session.user.email ?? undefined,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "bdt",
              unit_amount: Math.round(quote.total * 100),
              product_data: { name: `Order ${order.id.slice(-8).toUpperCase()}` },
            },
          },
        ],
        metadata: { orderId: order.id },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeId: checkoutSession.id },
      });
      return NextResponse.json({ id: order.id, checkoutUrl: checkoutSession.url });
    } catch (err) {
      console.error("Stripe checkout session failed", err);
      await cancelUnpaid("Card payment could not be started");
      return NextResponse.json(
        { error: "Card payment is unavailable. Please try another method." },
        { status: 502 },
      );
    }
  }

  if (method === "BKASH") {
    try {
      const created = await createBkashPayment({
        amount: quote.total,
        invoiceNumber: order.id,
        payerReference: normalizedPhone,
        callbackURL: `${appBase()}/api/payments/bkash/callback`,
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { bkashPaymentId: created.paymentID },
      });
      return NextResponse.json({ id: order.id, checkoutUrl: created.bkashURL });
    } catch (err) {
      console.error("bKash create_payment failed", err);
      await cancelUnpaid("bKash payment could not be started");
      return NextResponse.json(
        { error: "bKash payment is unavailable right now. Please try again." },
        { status: 502 },
      );
    }
  }

  if (method === "UPAY") {
    try {
      // The order id is unique and alphanumeric: it is both Upay's txn_id and
      // the invoice id. Stored first, so the expiry job can always ask Upay
      // about it even if the init answer is lost.
      await prisma.order.update({ where: { id: order.id }, data: { upayTxnId: order.id } });
      const created = await createUpayPayment({
        txnId: order.id,
        invoiceId: order.id,
        amount: quote.total,
        redirectUrl: `${appBase()}/api/payments/upay/callback?order=${order.id}`,
      });
      return NextResponse.json({ id: order.id, checkoutUrl: created.gatewayUrl });
    } catch (err) {
      console.error("Upay payment init failed", err);
      await cancelUnpaid("Upay payment could not be started");
      return NextResponse.json(
        { error: "Upay payment is unavailable right now. Please try again." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ id: order.id });
}
