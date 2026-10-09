import { prisma } from "@/lib/prisma";
import { getTrackingSettings } from "@/lib/tracking";
import { getSeoSettings } from "@/lib/seo-settings";
import { siteUrl } from "@/lib/site-url";
import { basePrice, unitPrice, variantLabel } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_#>`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4900);
const money = (n: number) => `${n.toFixed(2)} BDT`;

/**
 * Product feed for the Facebook / Instagram catalogue (Commerce Manager →
 * Data sources → Scheduled feed) and Google Merchant Center. One item per
 * size / colour option, grouped by item_group_id. Off unless turned on in
 * Admin → Pixel & analytics.
 */
export async function GET() {
  const t = await getTrackingSettings();
  if (!t.feedEnabled) return new Response("Not found", { status: 404 });
  const [seo, products] = await Promise.all([
    getSeoSettings().catch(() => null),
    prisma.product.findMany({
      where: { published: true },
      include: { variants: true, category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
  ]);
  const site = siteUrl();
  const brand = seo?.siteName || "Eid Bazar";
  const items: string[] = [];
  for (const p of products) {
    if (!p.images.length) continue; // catalogues reject items without a picture
    const link = `${site}/products/${p.slug}`;
    const desc = plain(p.description) || p.name;
    const common = [
      `<g:title>${esc(p.name.slice(0, 150))}</g:title>`,
      `<g:description>${esc(desc)}</g:description>`,
      `<g:link>${esc(link)}</g:link>`,
      `<g:image_link>${esc(p.images[0])}</g:image_link>`,
      ...p.images.slice(1, 10).map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`),
      `<g:brand>${esc(brand)}</g:brand>`,
      `<g:condition>new</g:condition>`,
      ...(p.category ? [`<g:product_type>${esc(p.category.name)}</g:product_type>`] : []),
    ];
    const price = (v?: (typeof p.variants)[number]) => {
      const now = unitPrice(p, v);
      const regular = Math.max(basePrice(p, v), p.compareAt != null ? Number(p.compareAt) : 0);
      return regular > now
        ? [`<g:price>${money(regular)}</g:price>`, `<g:sale_price>${money(now)}</g:sale_price>`]
        : [`<g:price>${money(now)}</g:price>`];
    };
    if (!p.variants.length) {
      items.push(
        `<item><g:id>${esc(p.id)}</g:id>${common.join("")}${price().join("")}<g:availability>${p.stock > 0 ? "in stock" : "out of stock"}</g:availability></item>`,
      );
      continue;
    }
    for (const v of p.variants) {
      items.push(
        `<item><g:id>${esc(v.sku || v.id)}</g:id><g:item_group_id>${esc(p.id)}</g:item_group_id>${common
          .join("")
          .replace(`<g:title>${esc(p.name.slice(0, 150))}</g:title>`, `<g:title>${esc(`${p.name} - ${variantLabel(v)}`.slice(0, 150))}</g:title>`)}${price(v).join("")}${
          v.size ? `<g:size>${esc(v.size)}</g:size>` : ""
        }${v.color ? `<g:color>${esc(v.color)}</g:color>` : ""}<g:availability>${v.stock > 0 ? "in stock" : "out of stock"}</g:availability></item>`,
      );
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(brand)}</title><link>${esc(site)}</link><description>${esc(brand)} products</description>
${items.join("\n")}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
