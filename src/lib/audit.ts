import "server-only";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma";

/**
 * Who did what in the admin panel. Append-only: nothing edits or deletes
 * these rows. Never put a secret (API key, password, token, 2FA secret) in
 * `data`; as a safety net, secret-looking fields are replaced by "(hidden)".
 */
export type AuditEntry = {
  action: string;
  targetType?: string;
  targetId?: string | null;
  summary?: string;
  data?: Record<string, unknown>;
};

type Actor = Pick<Session, "user"> | { user: { id: string; email?: string | null; name?: string | null } } | null;

const SECRET_KEY = /secret|password|token|apikey|api_key|key$|pass$/i;

/** Drops secret-looking fields, in case a caller passes a whole settings body. */
function scrub(v: unknown, depth = 0): unknown {
  if (depth > 4 || v === null || typeof v !== "object") {
    return typeof v === "string" && v.length > 500 ? `${v.slice(0, 500)}…` : v;
  }
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => scrub(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? (val ? "(hidden)" : val) : scrub(val, depth + 1);
  }
  return out;
}

/** Writes one audit entry. Never throws: an audit failure must not undo the action. */
export async function audit(actor: Actor, entry: AuditEntry): Promise<void> {
  try {
    const user = actor?.user;
    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        userLabel: user ? (user.email ?? user.name ?? user.id ?? "") : "system",
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        summary: (entry.summary ?? "").slice(0, 300),
        data: entry.data ? (scrub(entry.data) as Prisma.InputJsonValue) : undefined,
        ip: await clientIp().catch(() => null),
      },
    });
  } catch (err) {
    console.error("audit failed", entry.action, err);
  }
}

/** Human labels for the audit page. Unknown actions show as-is. */
export const AUDIT_LABEL: Record<string, string> = {
  "order.create": "Order created",
  "order.edit": "Order edited",
  "order.status": "Order status changed",
  "order.bulk": "Orders changed in bulk",
  "order.export": "Orders exported",
  "order.cod": "COD confirmation",
  "order.courier_book": "Parcel booked",
  "order.sms": "SMS sent",
  "order.refund": "Refund",
  "return.create": "Return created",
  "return.update": "Return updated",
  "return.refund": "Return refunded",
  "product.create": "Product created",
  "product.update": "Product updated",
  "product.delete": "Product deleted",
  "product.bulk": "Products changed in bulk",
  "product.import": "Products imported",
  "product.export": "Products exported",
  "category.create": "Category created",
  "category.update": "Category updated",
  "category.delete": "Category deleted",
  "inventory.adjust": "Stock adjusted",
  "coupon.create": "Coupon created",
  "coupon.update": "Coupon updated",
  "coupon.delete": "Coupon deleted",
  "settings.payments": "Payment settings",
  "settings.couriers": "Courier settings",
  "settings.sms": "SMS settings",
  "settings.order_rules": "Order rules",
  "settings.site": "Site settings",
  "settings.seo": "SEO",
  "settings.policy": "Legal page",
  "settings.pwa": "App settings",
  "settings.security": "Security rules",
  "blocklist.add": "Blocklist entry added",
  "blocklist.remove": "Blocklist entry removed",
  "user.role": "Role changed",
  "user.reset_link": "Password reset link made",
  "staff.add": "Staff added",
  "staff.role": "Staff role changed",
  "staff.remove": "Staff removed",
  "staff.reset_2fa": "Staff 2FA reset",
  "security.2fa_on": "Two-factor turned on",
  "security.2fa_off": "Two-factor turned off",
  "security.password": "Password changed",
  "security.password_reset": "Password reset",
  "security.recovery": "New recovery codes",
  "report.export": "Report exported",
  "customer.export": "Customers exported",
  "customer.marketing": "Customer SMS preference",
  "cart.remind": "Cart reminder sent",
  "campaign.send": "SMS campaign sent",
  "settings.tracking": "Pixel & analytics",
  "settings.carts": "Cart reminder settings",
};

export const AUDIT_GROUPS: Record<string, string> = {
  order: "Orders",
  return: "Returns",
  product: "Products",
  category: "Categories",
  inventory: "Inventory",
  coupon: "Coupons",
  settings: "Settings",
  blocklist: "Blocklist",
  user: "Users",
  staff: "Staff",
  security: "Security",
  report: "Reports",
  customer: "Customers",
  cart: "Abandoned carts",
  campaign: "Campaigns",
};
