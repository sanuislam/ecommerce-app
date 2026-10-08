import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma, type ReturnStatus, type ReturnType } from "@/generated/prisma";
import { getOrderSettings } from "@/lib/order-settings";
import { transitionOrder } from "@/lib/orders";
import { refundBkashPayment } from "@/lib/bkash";
import { refundUpayPayment } from "@/lib/upay";
import { round2, variantLabel } from "@/lib/pricing";
import { scheduleOrderText } from "@/lib/sms";
import { logStock } from "@/lib/stock-log";

export const RETURN_REASONS = [
  "Wrong size",
  "Damaged or defective",
  "Wrong item sent",
  "Not as described",
  "Changed my mind",
  "Other",
] as const;

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RECEIVED: "Item received",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const REFUND_METHODS = ["bKash", "Nagad", "Rocket", "Upay", "Bank transfer", "Cash"] as const;

/** Statuses that still hold the items (a new request can't take them again). */
const ACTIVE: ReturnStatus[] = ["REQUESTED", "APPROVED", "RECEIVED", "COMPLETED"];

export class ReturnError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** When the order was delivered (its DELIVERED event), or null. */
async function deliveredAt(orderId: string): Promise<Date | null> {
  const ev = await prisma.orderEvent.findFirst({
    where: { orderId, status: "DELIVERED" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return ev?.createdAt ?? null;
}

export type ReturnEligibility =
  | { ok: true; until: Date | null; items: { orderItemId: string; available: number }[] }
  | { ok: false; reason: string };

/** Can this order (still) be returned, and how many of each item. */
export async function returnEligibility(orderId: string, opts: { admin?: boolean } = {}): Promise<ReturnEligibility> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      returns: { where: { status: { in: ACTIVE } }, include: { items: true } },
    },
  });
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.status !== "DELIVERED") return { ok: false, reason: "Only delivered orders can be returned" };
  let until: Date | null = null;
  if (!opts.admin) {
    const rules = await getOrderSettings();
    if (!rules.returnsEnabled) return { ok: false, reason: "Returns are not available" };
    const at = (await deliveredAt(order.id)) ?? order.updatedAt;
    until = new Date(at.getTime() + rules.returnWindowDays * 86_400_000);
    if (until < new Date()) return { ok: false, reason: `Returns are possible for ${rules.returnWindowDays} days after delivery` };
  }
  const taken = new Map<string, number>();
  for (const r of order.returns) for (const i of r.items) taken.set(i.orderItemId, (taken.get(i.orderItemId) ?? 0) + i.quantity);
  const items = order.items.map((i) => ({ orderItemId: i.id, available: i.quantity - (taken.get(i.id) ?? 0) }));
  if (!items.some((i) => i.available > 0)) return { ok: false, reason: "Every item already has a return request" };
  return { ok: true, until, items };
}

export type CreateReturnInput = {
  type: ReturnType;
  reason: string;
  note?: string;
  items: { orderItemId: string; quantity: number; exchangeVariantId?: string | null }[];
};

export async function createReturn(orderId: string, input: CreateReturnInput, by: { admin: boolean; userId: string }) {
  const elig = await returnEligibility(orderId, { admin: by.admin });
  if (!elig.ok) throw new ReturnError(elig.reason, 409);
  const lines = input.items.filter((i) => i.quantity > 0);
  if (!lines.length) throw new ReturnError("Choose at least one item");

  const orderItems = await prisma.orderItem.findMany({ where: { orderId }, include: { product: { include: { variants: true } } } });
  const rows: Prisma.ReturnItemCreateManyRequestInput[] = [];
  for (const l of lines) {
    const oi = orderItems.find((o) => o.id === l.orderItemId);
    const avail = elig.items.find((e) => e.orderItemId === l.orderItemId)?.available ?? 0;
    if (!oi) throw new ReturnError("That item is not in this order");
    if (l.quantity > avail) throw new ReturnError(`Only ${avail} of "${oi.name}" can be returned`);
    let exchangeLabel: string | null = null;
    if (input.type === "EXCHANGE") {
      if (l.exchangeVariantId) {
        const v = oi.product.variants.find((x) => x.id === l.exchangeVariantId);
        if (!v) throw new ReturnError(`Choose an option of "${oi.name}" to exchange for`);
        exchangeLabel = variantLabel(v);
      } else {
        exchangeLabel = oi.variantName ? `Same (${oi.variantName})` : "Same item";
      }
    }
    rows.push({
      orderItemId: oi.id,
      quantity: l.quantity,
      exchangeVariantId: input.type === "EXCHANGE" ? (l.exchangeVariantId ?? oi.variantId ?? null) : null,
      exchangeLabel,
    });
  }

  const created = await prisma.returnRequest.create({
    data: {
      orderId,
      type: input.type,
      reason: input.reason.slice(0, 80),
      customerNote: input.note?.slice(0, 500) || null,
      createdById: by.userId,
      ...(by.admin ? { status: "APPROVED" as const } : {}),
      items: { createMany: { data: rows } },
    },
  });
  return created;
}

/** Moves a request between statuses exactly once (guarded by the expected status). */
async function move(id: string, from: ReturnStatus[], data: Prisma.ReturnRequestUpdateManyMutationInput) {
  const r = await prisma.returnRequest.updateMany({ where: { id, status: { in: from } }, data });
  if (r.count !== 1) throw new ReturnError("This request was changed by someone else. Refresh and try again.", 409);
}

const label = (r: { number: number }) => `R-${String(r.number).padStart(4, "0")}`;

export async function approveReturn(id: string, note?: string) {
  const r = await prisma.returnRequest.findUniqueOrThrow({ where: { id } });
  await move(id, ["REQUESTED"], { status: "APPROVED", adminNote: note || null });
  scheduleOrderText(
    r.orderId,
    `return:${id}:approved`,
    `Your ${r.type === "EXCHANGE" ? "exchange" : "return"} request ${label(r)} for order #${r.orderId.slice(0, 8)} is approved. We will contact you for pickup.`,
  );
}

export async function rejectReturn(id: string, note: string) {
  const r = await prisma.returnRequest.findUniqueOrThrow({ where: { id } });
  await move(id, ["REQUESTED", "APPROVED"], { status: "REJECTED", adminNote: note || null });
  scheduleOrderText(
    r.orderId,
    `return:${id}:rejected`,
    `Sorry, your request ${label(r)} for order #${r.orderId.slice(0, 8)} was not approved.${note ? ` ${note.slice(0, 80)}` : ""}`,
  );
}

export async function cancelReturn(id: string) {
  await move(id, ["REQUESTED"], { status: "CANCELLED" });
}

/** The parcel came back. With `restock`, the items go back on sale. */
export async function receiveReturn(id: string, restock: boolean) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.returnRequest.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "RECEIVED", restocked: restock },
    });
    if (r.count !== 1) throw new ReturnError("Only an approved request can be received", 409);
    if (!restock) return;
    const req = await tx.returnRequest.findUniqueOrThrow({ where: { id }, include: { items: { include: { orderItem: true } } } });
    await logStock(
      tx,
      req.items.map((it) => ({
        productId: it.orderItem.productId,
        variantId: it.orderItem.variantId,
        change: it.quantity,
        reason: "return" as const,
        orderId: req.orderId,
        note: `Return R-${String(req.number).padStart(4, "0")}`,
      })),
    );
    const touched = new Set<string>();
    for (const it of req.items) {
      const oi = it.orderItem;
      if (oi.variantId) {
        await tx.productVariant.updateMany({ where: { id: oi.variantId }, data: { stock: { increment: it.quantity } } });
      }
      touched.add(oi.productId);
      const hasVariants = await tx.productVariant.count({ where: { productId: oi.productId } });
      if (!hasVariants) {
        await tx.product.updateMany({ where: { id: oi.productId }, data: { stock: { increment: it.quantity } } });
      }
    }
    for (const productId of touched) {
      const agg = await tx.productVariant.aggregate({ where: { productId }, _sum: { stock: true }, _count: true });
      if (agg._count > 0) await tx.product.update({ where: { id: productId }, data: { stock: agg._sum.stock ?? 0 } });
    }
  });
}

/** Money back: through the payment gateway, or recorded as paid by hand. */
export async function refundReturn(
  id: string,
  opts: { amount: number; method: string; reference?: string; viaGateway: boolean },
) {
  const req = await prisma.returnRequest.findUniqueOrThrow({ where: { id }, include: { order: true } });
  if (!["APPROVED", "RECEIVED"].includes(req.status)) throw new ReturnError("Refund after the request is approved", 409);
  if (req.refundedAt) throw new ReturnError("This request is already refunded", 409);
  const order = req.order;
  const amount = round2(opts.amount);
  const left = round2(Number(order.total) - Number(order.refundedAmount));
  if (amount <= 0) throw new ReturnError("Enter the refund amount");
  if (amount > left) throw new ReturnError(`At most ৳${left.toFixed(2)} can still be refunded on this order`);

  // Reserve the amount first so two refunds can't pass the limit together.
  const reserved = await prisma.$executeRaw`
    UPDATE "Order" SET "refundedAmount" = "refundedAmount" + ${amount}
    WHERE "id" = ${order.id} AND "refundedAmount" + ${amount} <= "total"`;
  if (reserved !== 1) throw new ReturnError("The refund is more than what is left on the order", 409);

  let method = opts.method;
  let reference = opts.reference ?? null;
  try {
    if (opts.viaGateway) {
      if (order.paymentMethod === "BKASH" && order.bkashPaymentId && order.paymentTransactionId) {
        const r = await refundBkashPayment({
          paymentID: order.bkashPaymentId,
          trxID: order.paymentTransactionId,
          amount,
          reason: `Return ${label(req)}`,
          sku: `ret-${req.id}`,
        });
        const ok = r.statusCode === "0000" || r.transactionStatus?.toLowerCase() === "completed";
        if (!ok) throw new ReturnError(`bKash: ${r.statusMessage || r.errorMessage || "refund rejected"}`, 502);
        method = "bKash (gateway)";
        reference = r.refundTrxID ?? null;
      } else if (order.paymentMethod === "UPAY" && order.upayTxnId) {
        const r = await refundUpayPayment(order.upayTxnId, amount);
        if (!r.ok) throw new ReturnError(`Upay: ${r.message}`, 502);
        method = "Upay (gateway)";
      } else {
        throw new ReturnError("This order wasn't paid through a gateway; record the refund by hand", 400);
      }
    }
  } catch (err) {
    // Give the reserved amount back.
    await prisma.$executeRaw`
      UPDATE "Order" SET "refundedAmount" = GREATEST(0, "refundedAmount" - ${amount}) WHERE "id" = ${order.id}`;
    throw err;
  }

  await prisma.returnRequest.update({
    where: { id },
    data: {
      refundAmount: amount,
      refundMethod: method.slice(0, 40),
      refundReference: reference?.slice(0, 80) ?? null,
      refundedAt: new Date(),
      ...(req.status === "RECEIVED" ? { status: "COMPLETED" as const } : {}),
    },
  });
  await prisma.orderEvent.create({
    data: { orderId: order.id, status: order.status, note: `Refunded ৳${amount.toFixed(2)} (${method})` },
  });
  // Everything paid back: the order is refunded.
  const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { total: true, refundedAmount: true } });
  if (Number(after.refundedAmount) >= Number(after.total) - 0.009) {
    await transitionOrder({ orderId: order.id, from: ["DELIVERED", "PAID", "SHIPPED"], to: "REFUNDED", note: "Fully refunded" });
  }
  scheduleOrderText(
    order.id,
    `return:${id}:refunded`,
    `We refunded Tk ${amount.toLocaleString("en-IN")} for return ${label(req)} (order #${order.id.slice(0, 8)}) via ${method}.`,
  );
}

/**
 * Exchange: a new order with the replacement items, free of charge except the
 * delivery charge given. Stock is taken now; it ships like any order.
 */
export async function createReplacementOrder(id: string, deliveryCharge: number, adminId: string) {
  const req = await prisma.returnRequest.findUniqueOrThrow({
    where: { id },
    include: { order: true, items: { include: { orderItem: { include: { product: { include: { variants: true } } } } } } },
  });
  if (req.type !== "EXCHANGE") throw new ReturnError("Only exchanges get a replacement order");
  if (!["APPROVED", "RECEIVED"].includes(req.status)) throw new ReturnError("Approve the exchange first", 409);
  if (req.replacementOrderId) throw new ReturnError("A replacement order already exists", 409);

  const shipping = round2(Math.max(0, deliveryCharge));
  const newOrder = await prisma.$transaction(async (tx) => {
    const claimed = await tx.returnRequest.updateMany({
      where: { id, replacementOrderId: null },
      data: { replacementOrderId: "pending" },
    });
    if (claimed.count !== 1) throw new ReturnError("A replacement order already exists", 409);
    const lines = [];
    for (const it of req.items) {
      const oi = it.orderItem;
      const variant = it.exchangeVariantId ? oi.product.variants.find((v) => v.id === it.exchangeVariantId) : null;
      if (it.exchangeVariantId && !variant) throw new ReturnError(`The chosen option of "${oi.name}" no longer exists`);
      if (variant) {
        const ok = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (ok.count !== 1) throw new ReturnError(`"${oi.name} (${variantLabel(variant)})" is out of stock`, 409);
        await tx.product.update({ where: { id: oi.productId }, data: { stock: { decrement: it.quantity } } });
      } else {
        const ok = await tx.product.updateMany({
          where: { id: oi.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (ok.count !== 1) throw new ReturnError(`"${oi.name}" is out of stock`, 409);
      }
      lines.push({
        productId: oi.productId,
        variantId: variant?.id ?? oi.variantId ?? null,
        variantName: variant ? variantLabel(variant) : oi.variantName,
        name: oi.name,
        price: oi.price,
        quantity: it.quantity,
        image: oi.image,
        costPrice: variant?.costPrice ?? oi.costPrice ?? oi.product.costPrice ?? null,
      });
    }
    const subtotal = round2(lines.reduce((n, l) => n + Number(l.price) * l.quantity, 0));
    const o = await tx.order.create({
      data: {
        userId: req.order.userId,
        status: "PENDING",
        subtotal,
        discount: subtotal,
        tax: 0,
        shipping,
        total: shipping,
        currency: "BDT",
        shippingZone: req.order.shippingZone,
        paymentEmail: req.order.paymentEmail,
        paymentMethod: "COD",
        addressId: req.order.addressId,
        source: "exchange",
        createdById: adminId,
        codConfirmedAt: new Date(),
        codConfirmNote: `Exchange for ${label(req)}`,
        notes: `Exchange for order #${req.orderId.slice(0, 8)} (${label(req)})`,
        items: { create: lines },
        events: { create: { status: "PENDING", note: `Replacement for order #${req.orderId.slice(0, 8)}` } },
      },
    });
    await tx.returnRequest.update({ where: { id }, data: { replacementOrderId: o.id } });
    await logStock(
      tx,
      lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        change: -l.quantity,
        reason: "exchange" as const,
        orderId: o.id,
        userId: adminId,
      })),
    );
    return o;
  });
  return newOrder;
}

export async function completeReturn(id: string) {
  await move(id, ["RECEIVED", "APPROVED"], { status: "COMPLETED" });
}

export { label as returnLabel };

export function isReturnError(err: unknown): err is ReturnError {
  return err instanceof ReturnError;
}

/** Items of an order shaped for the return form (with exchange options). */
export async function returnableItems(orderId: string, available: { orderItemId: string; available: number }[]) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { product: { include: { variants: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } } } },
  });
  return items.map((i) => ({
    orderItemId: i.id,
    name: i.name,
    variantName: i.variantName,
    variantId: i.variantId,
    image: i.image,
    available: available.find((a) => a.orderItemId === i.id)?.available ?? 0,
    options: i.product.variants.map((v) => ({ id: v.id, label: variantLabel(v), stock: v.stock })),
  }));
}
