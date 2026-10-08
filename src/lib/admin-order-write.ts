import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildQuote, MAX_LINES, MAX_QTY_PER_LINE, type QuoteLine } from "@/lib/checkout";
import { isDistrict, normalizeBdPhone } from "@/lib/districts";
import { restockOrder } from "@/lib/orders";
import { round2, shippingFee } from "@/lib/pricing";
import { getShippingConfig } from "@/lib/site-settings";
import { ORDER_SOURCES } from "@/lib/admin-orders";
import { scheduleOrderSms } from "@/lib/sms";
import { logStock } from "@/lib/stock-log";
import type { Prisma } from "@/generated/prisma";

type Tx = Prisma.TransactionClient;

export class OrderWriteError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const itemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().positive().max(MAX_QTY_PER_LINE),
});

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the customer's name").max(80),
  phone: z.string().trim().min(1, "Enter the customer's phone"),
  district: z.string().trim().refine(isDistrict, "Choose the district"),
  area: z.string().trim().min(2, "Enter the area / thana").max(80),
  line1: z.string().trim().min(3, "Enter the full address").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  postalCode: z.string().trim().max(10).optional().default(""),
});

const moneySchema = z.number().min(0).max(1_000_000);

export const createOrderSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  address: addressSchema,
  items: z.array(itemSchema).min(1, "Add at least one product").max(MAX_LINES),
  shipping: moneySchema.nullable().optional(),
  discount: moneySchema.optional().default(0),
  payment: z.object({
    method: z.enum(["COD", "BKASH", "NAGAD", "ROCKET", "UPAY"]),
    paid: z.boolean(),
    trxId: z.string().trim().max(40).optional().default(""),
  }),
  source: z.enum(ORDER_SOURCES).default("phone"),
  notes: z.string().trim().max(500).optional().default(""),
  sendSms: z.boolean().optional().default(true),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const editOrderSchema = z.object({
  address: addressSchema,
  items: z.array(itemSchema).min(1, "An order needs at least one product").max(MAX_LINES),
  shipping: moneySchema.nullable().optional(),
  discount: moneySchema.optional().default(0),
  notes: z.string().trim().max(500).optional().default(""),
});
export type EditOrderInput = z.infer<typeof editOrderSchema>;

/** Prices the lines from the database; stock is checked when it is taken. */
async function price(items: z.infer<typeof itemSchema>[], district: string) {
  const quote = await buildQuote({ items, district });
  const blocking = quote.errors.filter((e) => !/in stock|out of stock/.test(e));
  if (blocking.length) throw new OrderWriteError(blocking[0]);
  if (!quote.lines.length) throw new OrderWriteError("Add at least one product");
  return quote;
}

/** Takes stock for each line, or fails the whole transaction. */
async function takeStock(tx: Tx, lines: QuoteLine[]) {
  for (const l of lines) {
    const label = `"${l.name}${l.variantName ? ` (${l.variantName})` : ""}"`;
    if (l.variantId) {
      const v = await tx.productVariant.updateMany({
        where: { id: l.variantId, stock: { gte: l.quantity } },
        data: { stock: { decrement: l.quantity } },
      });
      if (v.count !== 1) throw new OrderWriteError(`Not enough stock for ${label}`, 409);
      await tx.product.update({ where: { id: l.productId }, data: { stock: { decrement: l.quantity } } });
    } else {
      const p = await tx.product.updateMany({
        where: { id: l.productId, stock: { gte: l.quantity } },
        data: { stock: { decrement: l.quantity } },
      });
      if (p.count !== 1) throw new OrderWriteError(`Not enough stock for ${label}`, 409);
    }
  }
}

const itemRows = (lines: QuoteLine[]) =>
  lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    variantName: l.variantName,
    name: l.name,
    price: l.unitPrice,
    quantity: l.quantity,
    image: l.image,
    costPrice: l.unitCost,
  }));

const saleMoves = (lines: QuoteLine[], orderId: string, reason: "sale" | "order_edit", userId: string) =>
  lines.map((l) => ({ productId: l.productId, variantId: l.variantId, change: -l.quantity, reason, orderId, userId }));

function totals(subtotal: number, discount: number, shipping: number) {
  const d = round2(Math.min(discount, subtotal));
  return { subtotal, discount: d, shipping: round2(shipping), total: round2(subtotal - d + shipping) };
}

/** The customer for a phone order: by e-mail, then by phone, else a new account without a password. */
async function customerFor(name: string, phone: string, email: string) {
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (byEmail) return byEmail;
  }
  const tail = phone.slice(-10);
  const byPhone =
    (await prisma.user.findFirst({ where: { phone: { endsWith: tail } }, orderBy: { createdAt: "asc" } })) ??
    (
      await prisma.address.findFirst({
        where: { phone: { endsWith: tail } },
        orderBy: { createdAt: "asc" },
        select: { user: true },
      })
    )?.user;
  if (byPhone) return byPhone;
  // No account: one the customer can't sign in to (no password). The
  // ".invalid" address is never e-mailed.
  const placeholder = `${phone}@phone-order.invalid`;
  try {
    return await prisma.user.create({
      data: { name, phone, email: email ? email.toLowerCase() : placeholder },
    });
  } catch {
    const again = await prisma.user.findUnique({ where: { email: email ? email.toLowerCase() : placeholder } });
    if (again) return again;
    throw new OrderWriteError("Could not save the customer. Try again.", 500);
  }
}

/** An order typed in by an admin (phone, Facebook, WhatsApp…). */
export async function createAdminOrder(input: CreateOrderInput, adminId: string) {
  const phone = normalizeBdPhone(input.address.phone);
  if (!phone) throw new OrderWriteError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX)");
  const trxId = input.payment.trxId.toUpperCase();
  if (input.payment.paid && input.payment.method !== "COD" && !/^[A-Z0-9]{6,20}$/.test(trxId)) {
    throw new OrderWriteError("Enter the Transaction ID of the payment");
  }
  const quote = await price(input.items, input.address.district);
  const t = totals(quote.subtotal, input.discount, input.shipping ?? quote.shipping);
  const user = await customerFor(input.address.fullName, phone, input.email || "");
  const paid = input.payment.paid;

  const order = await prisma.$transaction(async (tx) => {
    await takeStock(tx, quote.lines);
    const a = input.address;
    const hasDefault = await tx.address.count({ where: { userId: user.id, isDefault: true, archived: false } });
    const address = await tx.address.create({
      data: {
        userId: user.id,
        fullName: a.fullName,
        phone,
        line1: a.line1,
        line2: a.line2 || null,
        city: a.area,
        state: a.district,
        postalCode: a.postalCode || null,
        country: "BD",
        isDefault: hasDefault === 0,
      },
    });
    if (!user.phone) await tx.user.update({ where: { id: user.id }, data: { phone } });
    const created = await tx.order.create({
      data: {
        userId: user.id,
        status: paid ? "PAID" : "PENDING",
        ...t,
        tax: 0,
        currency: "BDT",
        shippingZone: quote.zone,
        paymentEmail: user.email.endsWith(".invalid") ? null : user.email,
        paymentMethod: input.payment.method,
        paymentTransactionId: paid && trxId ? trxId : null,
        notes: input.notes || null,
        addressId: address.id,
        source: input.source,
        createdById: adminId,
        items: { create: itemRows(quote.lines) },
        events: {
          create: [
            { status: "PENDING", note: "Order placed" },
            ...(paid ? [{ status: "PAID" as const, note: "Payment received" }] : []),
          ],
        },
      },
    });
    await logStock(tx, saleMoves(quote.lines, created.id, "sale", adminId));
    return created;
  });
  if (input.sendSms) scheduleOrderSms(order.id, "placed");
  return order;
}

/** Changes an order's address, products, delivery charge or discount before it ships. */
export async function editAdminOrder(orderId: string, input: EditOrderInput, adminId: string) {
  const phone = normalizeBdPhone(input.address.phone);
  if (!phone) throw new OrderWriteError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX)");
  const quote = await price(input.items, input.address.district);

  return prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    if (!locked) throw new OrderWriteError("Order not found", 404);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (!["PENDING", "PAID"].includes(order.status)) {
      throw new OrderWriteError("Only orders that haven't shipped can be edited", 409);
    }
    if (order.courierConsignmentId) {
      throw new OrderWriteError("This order is booked with a courier; cancel the parcel there first", 409);
    }
    // Lines already on the order keep the price the customer was quoted.
    const oldPrice = new Map(order.items.map((i) => [`${i.productId}:${i.variantId ?? ""}`, Number(i.price)]));
    for (const l of quote.lines) {
      const p = oldPrice.get(`${l.productId}:${l.variantId ?? ""}`);
      if (p !== undefined) {
        l.unitPrice = p;
        l.lineTotal = round2(p * l.quantity);
      }
    }
    const subtotal = round2(quote.lines.reduce((n, l) => n + l.lineTotal, 0));
    const autoShipping = shippingFee(subtotal, quote.zone, await getShippingConfig());
    const t = totals(subtotal, input.discount, input.shipping ?? autoShipping);
    const gatewayPaid = !!(order.bkashPaymentId || order.upayTxnId || order.stripeId) && order.status === "PAID";
    if (gatewayPaid && Math.abs(t.total - Number(order.total)) >= 0.01) {
      throw new OrderWriteError(
        "This order was paid online: the total can't change. Edit the address only, or refund it.",
        409,
      );
    }

    // Products: give back the old lines' stock, then take the new.
    await restockOrder(tx, order.id, "order_edit", adminId);
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await takeStock(tx, quote.lines);
    await logStock(tx, saleMoves(quote.lines, order.id, "order_edit", adminId));
    await tx.orderItem.createMany({ data: itemRows(quote.lines).map((r) => ({ ...r, orderId: order.id })) });

    // The order gets its own address row, so the customer's address book isn't changed.
    const a = input.address;
    const address = await tx.address.create({
      data: {
        userId: order.userId,
        fullName: a.fullName,
        phone,
        line1: a.line1,
        line2: a.line2 || null,
        city: a.area,
        state: a.district,
        postalCode: a.postalCode || null,
        country: "BD",
        archived: true,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        ...t,
        shippingZone: quote.zone,
        addressId: address.id,
        notes: input.notes || null,
        createdById: adminId,
      },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, status: order.status, note: "Order details updated" },
    });
    return { id: order.id };
  });
}
