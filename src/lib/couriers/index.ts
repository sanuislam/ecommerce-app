import "server-only";
import { prisma } from "@/lib/prisma";
import { transitionOrder } from "@/lib/orders";
import { bdMobile } from "@/lib/sms";
import {
  bestMatch,
  COURIER_LABEL,
  CourierError,
  courierReady,
  getCourierSettings,
  prettyStatus,
  type CourierId,
  type CourierSettingsRow,
} from "@/lib/couriers/common";
import { steadfastCreate, steadfastDelivered, steadfastStatus } from "@/lib/couriers/steadfast";
import { pathaoCities, pathaoCreate, pathaoDelivered, pathaoStatus, pathaoZones } from "@/lib/couriers/pathao";
import { redxAreas, redxCreate, redxDelivered, redxStatus } from "@/lib/couriers/redx";

export * from "@/lib/couriers/common";

export type BookOptions = {
  /** Pathao: city / zone / area ids (otherwise matched from the address). */
  pathaoCity?: number;
  pathaoZone?: number;
  pathaoArea?: number;
  /** RedX: delivery area (otherwise matched from the address). */
  redxAreaId?: number;
  redxAreaName?: string;
  weightKg?: number;
  note?: string;
};

export type BookResult =
  | { ok: true; consignmentId: string; tracking: string }
  | { ok: false; error: string };

// A booking in progress holds the order for 2 minutes (a crash mid-way frees it).
const CLAIM_MS = 2 * 60_000;

/** Books one order with a courier and marks it shipped. Never books twice. */
export async function bookOrder(orderId: string, courier: CourierId, opts: BookOptions = {}): Promise<BookResult> {
  const s = await getCourierSettings();
  if (!courierReady(s, courier)) return { ok: false, error: `${COURIER_LABEL[courier]} is not set up` };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { address: true, user: { select: { name: true, phone: true } }, items: true },
  });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.courierConsignmentId) {
    return { ok: false, error: `Already booked with ${order.courier} (${order.courierConsignmentId})` };
  }
  const canShip =
    order.status === "PAID" || (order.status === "PENDING" && order.paymentMethod === "COD");
  if (!canShip) {
    return {
      ok: false,
      error:
        order.status === "PENDING"
          ? "Payment is not confirmed yet"
          : `A ${order.status.toLowerCase()} order can't be booked`,
    };
  }
  const phone = bdMobile(order.address?.phone) ?? bdMobile(order.user.phone);
  if (!phone) return { ok: false, error: "The order has no valid 01XXXXXXXXX phone number" };
  if (!order.address) return { ok: false, error: "The order has no delivery address" };

  // Claim: only one booking at a time per order.
  const claimed = await prisma.order.updateMany({
    where: {
      id: order.id,
      courierConsignmentId: null,
      OR: [
        { courierStatus: { not: "booking" } },
        { courierStatus: null },
        { courierUpdatedAt: { lt: new Date(Date.now() - CLAIM_MS) } },
      ],
    },
    data: { courierStatus: "booking", courierUpdatedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, error: "This order is being booked right now" };

  const a = order.address;
  const name = (a.fullName || order.user.name || "Customer").slice(0, 100);
  const address = [a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ").slice(0, 220);
  // Online payments are already paid: collect nothing.
  const cod = order.paymentMethod === "COD" && !order.paymentTransactionId ? Math.round(Number(order.total)) : 0;
  const qty = order.items.reduce((n, i) => n + i.quantity, 0) || 1;
  const weight = Math.min(10, Math.max(0.5, opts.weightKg ?? Number(s.defaultWeightKg) ?? 0.5));
  const description = order.items
    .map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity}`)
    .join(", ")
    .slice(0, 200);
  const note = (opts.note ?? order.notes ?? "").slice(0, 200) || undefined;

  try {
    let r: { consignmentId: string; tracking: string; status: string; charge: number | null };
    if (courier === "steadfast") {
      r = await steadfastCreate(s, {
        invoice: order.id,
        recipient_name: name,
        recipient_phone: phone,
        recipient_address: address,
        cod_amount: cod,
        note,
        item_description: description,
        total_lot: qty,
      });
    } else if (courier === "pathao") {
      const ids = await pathaoIds(s, a.state, a.city, opts);
      r = await pathaoCreate(s, {
        merchant_order_id: order.id,
        recipient_name: name.length >= 3 ? name : `${name} ..`.slice(0, 3),
        recipient_phone: phone,
        recipient_address: address.length >= 10 ? address : `${address}, Bangladesh`,
        ...ids,
        amount_to_collect: cod,
        item_quantity: qty,
        item_weight: weight,
        item_description: description,
        special_instruction: note,
      });
    } else {
      const area = await redxArea(s, a.state, a.city, a.postalCode, opts);
      r = await redxCreate(s, {
        customer_name: name,
        customer_phone: phone,
        delivery_area: area.name,
        delivery_area_id: area.id,
        customer_address: address,
        merchant_invoice_id: order.id,
        cash_collection_amount: String(cod),
        parcel_weight: Math.round(weight * 1000),
        value: Math.round(Number(order.total)),
        instruction: note,
      });
    }

    const shipping = {
      courier,
      courierConsignmentId: r.consignmentId,
      trackingNumber: r.tracking,
      courierStatus: r.status,
      courierUpdatedAt: new Date(),
      ...(r.charge != null ? { courierCharge: r.charge } : {}),
    };
    const shipped = await transitionOrder({
      orderId: order.id,
      from: order.status,
      to: "SHIPPED",
      note: `Handed to ${COURIER_LABEL[courier]} (tracking ${r.tracking})`,
      data: shipping,
    });
    // Status moved meanwhile: still record the parcel — it exists at the courier.
    if (!shipped) await prisma.order.update({ where: { id: order.id }, data: shipping });
    return { ok: true, consignmentId: r.consignmentId, tracking: r.tracking };
  } catch (err) {
    await prisma.order.updateMany({
      where: { id: order.id, courierConsignmentId: null },
      data: { courierStatus: null, courierUpdatedAt: null },
    });
    const msg = err instanceof Error ? err.message : "Booking failed";
    return { ok: false, error: msg };
  }
}

async function pathaoIds(
  s: CourierSettingsRow,
  district: string | null,
  thana: string,
  opts: BookOptions,
): Promise<{ recipient_city?: number; recipient_zone?: number; recipient_area?: number }> {
  if (opts.pathaoCity && opts.pathaoZone) {
    return { recipient_city: opts.pathaoCity, recipient_zone: opts.pathaoZone, recipient_area: opts.pathaoArea };
  }
  // Match from the address; if that fails Pathao reads the address itself.
  try {
    const city = bestMatch(await pathaoCities(s), (c) => c.name, district);
    if (!city) return {};
    const zone = bestMatch(await pathaoZones(s, city.id), (z) => z.name, thana);
    return zone ? { recipient_city: city.id, recipient_zone: zone.id } : { recipient_city: city.id };
  } catch {
    return {};
  }
}

async function redxArea(
  s: CourierSettingsRow,
  district: string | null,
  thana: string,
  postCode: string | null,
  opts: BookOptions,
): Promise<{ id: number; name: string }> {
  if (opts.redxAreaId && opts.redxAreaName) return { id: opts.redxAreaId, name: opts.redxAreaName };
  if (postCode && /^\d{4}$/.test(postCode)) {
    const byPost = await redxAreas(s, { postCode });
    const m = bestMatch(byPost, (x) => x.name, thana) ?? (byPost.length === 1 ? byPost[0] : null);
    if (m) return m;
  }
  if (district) {
    const m = bestMatch(await redxAreas(s, { district }), (x) => x.name, thana);
    if (m) return m;
  }
  throw new CourierError(`RedX: no delivery area matches "${thana}". Book this order alone and choose the area.`);
}

/** Saves a courier's status for an order; a confirmed delivery marks it delivered. */
export async function applyCourierStatus(
  orderId: string,
  courier: CourierId,
  raw: string,
  charge?: number | null,
) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      courierStatus: raw,
      courierUpdatedAt: new Date(),
      ...(charge != null ? { courierCharge: charge } : {}),
    },
  });
  const delivered =
    courier === "steadfast" ? steadfastDelivered(raw) : courier === "pathao" ? pathaoDelivered(raw) : redxDelivered(raw);
  if (delivered) {
    await transitionOrder({
      orderId,
      from: "SHIPPED",
      to: "DELIVERED",
      note: `Delivered by ${COURIER_LABEL[courier]}`,
    });
  }
}

/** Asks the courier for an order's latest status. */
export async function refreshCourierStatus(orderId: string): Promise<{ ok: boolean; status?: string; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, courier: true, courierConsignmentId: true },
  });
  if (!order?.courierConsignmentId || !order.courier) return { ok: false, error: "Not booked with a courier" };
  const courier = order.courier as CourierId;
  const s = await getCourierSettings();
  try {
    let raw: string;
    let charge: number | null = null;
    if (courier === "steadfast") raw = await steadfastStatus(s, order.courierConsignmentId);
    else if (courier === "pathao") raw = await pathaoStatus(s, order.courierConsignmentId);
    else if (courier === "redx") ({ status: raw, charge } = await redxStatus(s, order.courierConsignmentId));
    else return { ok: false, error: "Unknown courier" };
    await applyCourierStatus(order.id, courier, raw, charge);
    return { ok: true, status: prettyStatus(raw) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Status check failed" };
  }
}

/** Refreshes shipped orders not heard about for a while (cron). */
export async function syncShippedOrders(limit = 60) {
  const stale = new Date(Date.now() - 3 * 60 * 60_000);
  const orders = await prisma.order.findMany({
    where: {
      status: "SHIPPED",
      courierConsignmentId: { not: null },
      OR: [{ courierUpdatedAt: null }, { courierUpdatedAt: { lt: stale } }],
    },
    select: { id: true },
    orderBy: { courierUpdatedAt: "asc" },
    take: limit,
  });
  let delivered = 0;
  for (const o of orders) {
    const r = await refreshCourierStatus(o.id);
    if (r.ok && r.status?.toLowerCase() === "delivered") delivered++;
  }
  return { checked: orders.length, delivered };
}
