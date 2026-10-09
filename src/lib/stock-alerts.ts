import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSmsSettings, sendSms } from "@/lib/sms";
import { getSeoSettings } from "@/lib/seo-settings";
import { siteUrl } from "@/lib/site-url";
import { variantLabel } from "@/lib/pricing";

/**
 * Texts everyone waiting for these products (or their options) that are in
 * stock again. Each alert is claimed before sending, so it goes once.
 */
export async function notifyBackInStock(productIds: string[]) {
  const ids = [...new Set(productIds)].slice(0, 200);
  if (!ids.length) return 0;
  const alerts = await prisma.stockAlert.findMany({ where: { productId: { in: ids }, notifiedAt: null }, take: 500 });
  if (!alerts.length) return 0;
  const sms = await getSmsSettings();
  if (!sms.enabled || !sms.apiKey) return 0;
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(alerts.map((a) => a.productId))] }, published: true },
    select: { id: true, name: true, slug: true, stock: true, variants: { select: { id: true, stock: true, size: true, color: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
  let sent = 0;
  for (const a of alerts) {
    const p = byId.get(a.productId);
    if (!p) continue;
    const v = a.variantId ? p.variants.find((x) => x.id === a.variantId) : null;
    const inStock = a.variantId ? (v?.stock ?? 0) > 0 : p.stock > 0;
    if (!inStock) continue;
    const claimed = await prisma.stockAlert.updateMany({ where: { id: a.id, notifiedAt: null }, data: { notifiedAt: new Date() } });
    if (claimed.count !== 1) continue;
    const name = `${p.name.length > 40 ? `${p.name.slice(0, 39)}…` : p.name}${v ? ` (${variantLabel(v)})` : ""}`;
    const r = await sendSms(sms.apiKey, a.phone, `Good news: ${name} is back in stock at ${shop}. ${siteUrl()}/products/${p.slug}`, sms.senderId || undefined);
    if (r.ok) sent++;
    else await prisma.stockAlert.update({ where: { id: a.id }, data: { notifiedAt: null } });
  }
  return sent;
}

/** After the current request (stock was just added), send the alerts. */
export function scheduleBackInStock(productIds: string[]) {
  if (!productIds.length) return;
  const run = () => notifyBackInStock(productIds).catch((e) => console.error("back-in-stock", e));
  try {
    after(run);
  } catch {
    void run();
  }
}
