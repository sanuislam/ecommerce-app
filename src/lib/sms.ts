import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { siteUrl } from "@/lib/site-url";
import { getSeoSettings } from "@/lib/seo-settings";

/**
 * Customer SMS through Alpha SMS (sms.net.bd).
 *   POST https://api.sms.net.bd/sendsms  (form: api_key, msg, to, sender_id?)
 *   → { error: 0, msg, data: { request_id } }  — error ≠ 0 is a failure, even on HTTP 200.
 */
const SMS_BASE = "https://api.sms.net.bd";

export const SMS_EVENTS = ["placed", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type SmsEvent = (typeof SMS_EVENTS)[number];

export const SMS_EVENT_LABEL: Record<SmsEvent, string> = {
  placed: "Order received",
  confirmed: "Payment received (cash on delivery)",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// English keeps one SMS to 160 characters (Bangla fits only 70 per part).
export const DEFAULT_TEMPLATES: Record<SmsEvent, string> = {
  placed: "Hi {name}, we received your order #{order} ({total}). We will call you to confirm. - {shop}",
  confirmed: "Hi {name}, payment of {total} for order #{order} is received. Thank you! - {shop}",
  shipped: "Your order #{order} is on the way with {courier}. Tracking: {tracking} - {shop}",
  delivered: "Your order #{order} is delivered. Thanks for shopping with {shop}!",
  cancelled: "Your order #{order} has been cancelled. Questions? Call us. - {shop}",
};

export const TEMPLATE_VARS = ["{name}", "{order}", "{total}", "{courier}", "{tracking}", "{link}", "{shop}"];

export type SmsSettingsValues = {
  enabled: boolean;
  apiKey: string;
  senderId: string;
  on: Record<SmsEvent, boolean>;
  templates: Record<SmsEvent, string>;
};

const TPL_FIELD = {
  placed: "tplPlaced",
  confirmed: "tplConfirmed",
  shipped: "tplShipped",
  delivered: "tplDelivered",
  cancelled: "tplCancelled",
} as const;
const ON_FIELD = {
  placed: "onPlaced",
  confirmed: "onConfirmed",
  shipped: "onShipped",
  delivered: "onDelivered",
  cancelled: "onCancelled",
} as const;

export async function getSmsSettings(): Promise<SmsSettingsValues> {
  const row = await prisma.smsSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  const on = {} as Record<SmsEvent, boolean>;
  const templates = {} as Record<SmsEvent, string>;
  for (const e of SMS_EVENTS) {
    on[e] = row ? row[ON_FIELD[e]] : e !== "confirmed";
    templates[e] = (row?.[TPL_FIELD[e]] || "").trim() || DEFAULT_TEMPLATES[e];
  }
  return { enabled: row?.enabled ?? false, apiKey: row?.apiKey ?? "", senderId: row?.senderId ?? "", on, templates };
}

export { ON_FIELD as SMS_ON_FIELD, TPL_FIELD as SMS_TPL_FIELD };

/** 01XXXXXXXXX, or null when it isn't a Bangladeshi mobile number. */
export function bdMobile(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  const local = d.startsWith("880") ? `0${d.slice(3)}` : d.startsWith("1") && d.length === 10 ? `0${d}` : d;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

export function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m)).replace(/\s+/g, " ").trim();
}

export type SmsResult = { ok: true; requestId: string | null } | { ok: false; error: string };

export async function sendSms(apiKey: string, to: string, msg: string, senderId?: string): Promise<SmsResult> {
  const body = new URLSearchParams({ api_key: apiKey, msg, to });
  if (senderId) body.set("sender_id", senderId);
  try {
    const res = await fetch(`${SMS_BASE}/sendsms`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: number | string;
      msg?: string;
      data?: { request_id?: number | string };
    };
    if (Number(json.error) === 0 && res.ok) {
      return { ok: true, requestId: json.data?.request_id != null ? String(json.data.request_id) : null };
    }
    return { ok: false, error: `${json.error ?? res.status}: ${json.msg ?? "SMS rejected"}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach the SMS gateway" };
  }
}

export async function smsBalance(apiKey: string): Promise<{ ok: boolean; balance?: string; error?: string }> {
  try {
    const res = await fetch(`${SMS_BASE}/user/balance/?api_key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: number; msg?: string; data?: { balance?: string } };
    if (Number(json.error) === 0) return { ok: true, balance: json.data?.balance };
    return { ok: false, error: `${json.error ?? res.status}: ${json.msg ?? "Rejected"}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach the SMS gateway" };
  }
}

const COURIER_NAME: Record<string, string> = { steadfast: "Steadfast", pathao: "Pathao", redx: "RedX" };

/** The message an order event would send (for previews and sending). */
export async function orderSmsMessage(orderId: string, event: SmsEvent, tpl?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { address: true, user: { select: { name: true, phone: true } } },
  });
  if (!order) return null;
  const phone = bdMobile(order.address?.phone) ?? bdMobile(order.user.phone);
  const settings = tpl ? null : await getSmsSettings();
  const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
  const name = (order.address?.fullName || order.user.name || "Customer").split(" ")[0];
  const message = renderTemplate(tpl ?? settings!.templates[event], {
    name,
    order: order.id.slice(0, 8),
    // "Tk", not "৳": one non-GSM character makes the whole SMS Unicode (70 chars, more parts).
    total: `Tk ${Number(order.total).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
    courier: COURIER_NAME[order.courier ?? ""] ?? order.courier ?? "our courier",
    tracking: order.trackingNumber ?? "-",
    link: `${siteUrl()}/orders/${order.id}`,
    shop,
  });
  return { phone, message };
}

/**
 * Sends an order's SMS for an event once (the (orderId, event) row is the
 * claim). Never throws: a failed SMS must not break an order change.
 */
export async function notifyOrder(orderId: string, event: SmsEvent): Promise<void> {
  try {
    const s = await getSmsSettings();
    if (!s.enabled || !s.apiKey || !s.on[event]) return;
    const built = await orderSmsMessage(orderId, event);
    if (!built?.phone) return;
    let log;
    try {
      log = await prisma.smsLog.create({
        data: { orderId, event, phone: built.phone, message: built.message },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return; // already sent
      throw err;
    }
    const r = await sendSms(s.apiKey, built.phone, built.message, s.senderId || undefined);
    await prisma.smsLog.update({
      where: { id: log.id },
      data: r.ok ? { status: "sent", requestId: r.requestId } : { status: "failed", error: r.error.slice(0, 300) },
    });
  } catch (err) {
    console.error("SMS notify failed", orderId, event, err);
  }
}

/** Sends after the response is finished, so a slow gateway never delays the page. */
export function scheduleOrderSms(orderId: string, event: SmsEvent) {
  try {
    after(() => notifyOrder(orderId, event));
  } catch {
    // Outside a request (scripts): send now in the background.
    void notifyOrder(orderId, event);
  }
}

/** A one-off order message (returns etc.), sent once per event key. Never throws. */
export async function sendOrderText(orderId: string, event: string, message: string): Promise<void> {
  try {
    const s = await getSmsSettings();
    if (!s.enabled || !s.apiKey) return;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { address: { select: { phone: true } }, user: { select: { phone: true } } },
    });
    const phone = bdMobile(order?.address?.phone) ?? bdMobile(order?.user.phone);
    if (!phone) return;
    let log;
    try {
      log = await prisma.smsLog.create({ data: { orderId, event, phone, message } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
      throw err;
    }
    const r = await sendSms(s.apiKey, phone, message, s.senderId || undefined);
    await prisma.smsLog.update({
      where: { id: log.id },
      data: r.ok ? { status: "sent", requestId: r.requestId } : { status: "failed", error: r.error.slice(0, 300) },
    });
  } catch (err) {
    console.error("SMS send failed", orderId, event, err);
  }
}

export function scheduleOrderText(orderId: string, event: string, message: string) {
  try {
    after(() => sendOrderText(orderId, event, message));
  } catch {
    void sendOrderText(orderId, event, message);
  }
}
