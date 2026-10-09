import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSeoSettings } from "@/lib/seo-settings";
import { siteUrl } from "@/lib/site-url";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function getTrackingSettings() {
  const row = await prisma.trackingSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  return { fbCapiToken: row?.fbCapiToken ?? "", fbTestCode: row?.fbTestCode ?? "", feedEnabled: row?.feedEnabled ?? false };
}

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

/** 8801XXXXXXXXX for Facebook matching, or null. */
function e164(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "");
  const local = d.startsWith("880") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d;
  return /^1[3-9]\d{8}$/.test(local) ? `880${local}` : null;
}

/** The shopper's browser details, read while the request is still open. */
export type BrowserContext = { ip?: string; ua?: string; fbp?: string; fbc?: string };

export async function browserContext(): Promise<BrowserContext> {
  try {
    const h = await headers();
    const c = await cookies();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined,
      ua: h.get("user-agent") ?? undefined,
      fbp: c.get("_fbp")?.value,
      fbc: c.get("_fbc")?.value,
    };
  } catch {
    return {};
  }
}

/**
 * Sends the order's Purchase event to the Facebook Conversions API, once
 * (claimed with Order.trackedAt). The browser Pixel sends the same event
 * with eventID = order id, so Facebook counts it once. Customer details are
 * SHA-256 hashed as Facebook requires. Never throws.
 */
export async function sendPurchaseEvent(orderId: string, ctx: BrowserContext = {}) {
  try {
    const [seo, t] = await Promise.all([getSeoSettings().catch(() => null), getTrackingSettings()]);
    const pixel = seo?.metaPixelId?.trim();
    if (!pixel || !t.fbCapiToken) return;
    // Only shop orders: an order typed in by staff isn't a website conversion.
    const claimed = await prisma.order.updateMany({
      where: { id: orderId, trackedAt: null, source: "web" },
      data: { trackedAt: new Date() },
    });
    if (claimed.count !== 1) return;
    const o = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { productId: true, quantity: true, price: true } },
        user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true, name: true } },
        address: { select: { phone: true, city: true, state: true } },
      },
    });
    if (!o) return;
    const email = o.user.email.endsWith(".invalid") ? null : o.user.email;
    const phone = e164(o.address?.phone ?? o.user.phone);
    const first = o.user.firstName || o.user.name?.split(" ")[0] || "";
    const user_data: Record<string, unknown> = {
      external_id: [sha(o.user.id)],
      country: [sha("bd")],
      ...(email ? { em: [sha(email)] } : {}),
      ...(phone ? { ph: [sha(phone)] } : {}),
      ...(first ? { fn: [sha(first)] } : {}),
      ...(o.user.lastName ? { ln: [sha(o.user.lastName)] } : {}),
      ...(o.address?.state ? { ct: [sha(o.address.state.replace(/\s/g, ""))] } : {}),
      ...(ctx.ip ? { client_ip_address: ctx.ip } : {}),
      ...(ctx.ua ? { client_user_agent: ctx.ua } : {}),
      ...(ctx.fbp ? { fbp: ctx.fbp } : {}),
      ...(ctx.fbc ? { fbc: ctx.fbc } : {}),
    };
    const body = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(o.createdAt.getTime() / 1000),
          event_id: o.id,
          action_source: "website",
          event_source_url: `${siteUrl()}/checkout`,
          user_data,
          custom_data: {
            currency: "BDT",
            value: Number(o.total),
            order_id: o.id,
            content_type: "product",
            content_ids: o.items.map((i) => i.productId),
            contents: o.items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: Number(i.price) })),
            num_items: o.items.reduce((s, i) => s + i.quantity, 0),
          },
        },
      ],
      ...(t.fbTestCode ? { test_event_code: t.fbTestCode } : {}),
    };
    const res = await fetch(`${GRAPH}/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(t.fbCapiToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("CAPI Purchase failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
      // Let a later trigger try again.
      await prisma.order.update({ where: { id: orderId }, data: { trackedAt: null } });
    }
  } catch (err) {
    console.error("CAPI Purchase failed", err);
  }
}

/** Sends a test event to check the token and pixel (Events Manager → Test events shows it). */
export async function testConversionsApi(token: string, pixel: string, testCode: string) {
  const res = await fetch(`${GRAPH}/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          event_name: "PageView",
          event_time: Math.floor(Date.now() / 1000),
          event_id: `test-${Date.now()}`,
          action_source: "website",
          event_source_url: siteUrl(),
          user_data: { external_id: [sha("connection-test")], client_user_agent: "EidBazar-CAPI-test" },
        },
      ],
      ...(testCode ? { test_event_code: testCode } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((e: unknown) => e as Error);
  if (res instanceof Error) return { ok: false, error: res.message };
  const json = (await res.json().catch(() => ({}))) as { events_received?: number; error?: { message?: string } };
  return res.ok ? { ok: true, received: json.events_received ?? 0 } : { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
}
