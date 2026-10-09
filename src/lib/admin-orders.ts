import "server-only";
import { OrderStatus, PaymentMethod, type Prisma } from "@/generated/prisma";
import { parseOrderNo } from "@/lib/order-number";

export const ORDER_STATUSES = Object.values(OrderStatus);
export const PAYMENT_METHODS = Object.values(PaymentMethod);
export const ORDER_SOURCES = ["web", "phone", "facebook", "whatsapp", "instagram", "other"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const SOURCE_LABEL: Record<string, string> = {
  web: "Website",
  phone: "Phone call",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  other: "Other",
  exchange: "Exchange",
};

export const PAGE_SIZE = 50;

export type OrderFilters = {
  status: OrderStatus | null;
  q: string;
  method: PaymentMethod | null;
  courier: string | null; // "none" = not booked
  /** "call": cash on delivery orders waiting to be confirmed. */
  confirm: "call" | null;
  from: string; // YYYY-MM-DD (Dhaka)
  to: string;
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function parseOrderFilters(sp: Raw | URLSearchParams): OrderFilters {
  const get = (k: string) => (sp instanceof URLSearchParams ? (sp.get(k) ?? "") : first(sp[k]));
  const rawStatus = get("status").toUpperCase();
  const rawMethod = get("method").toUpperCase();
  const courier = get("courier").toLowerCase();
  const page = Math.max(1, Math.min(10_000, Number.parseInt(get("page"), 10) || 1));
  return {
    status: ORDER_STATUSES.find((s) => s === rawStatus) ?? null,
    q: get("q").trim().slice(0, 100),
    method: PAYMENT_METHODS.find((m) => m === rawMethod) ?? null,
    courier: ["steadfast", "pathao", "redx", "none"].includes(courier) ? courier : null,
    confirm: get("confirm") === "call" ? "call" : null,
    from: isDay(get("from")) ? get("from") : "",
    to: isDay(get("to")) ? get("to") : "",
    page,
  };
}

/** Start of a Dhaka calendar day (UTC+6, no DST). */
const dhakaDayStart = (day: string) => new Date(`${day}T00:00:00+06:00`);

/** The order filter, without the status (the tabs count every status). */
export function orderWhere(f: OrderFilters, withStatus = true): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (withStatus && f.status) and.push({ status: f.status });
  if (f.method) and.push({ paymentMethod: f.method });
  if (f.courier === "none") and.push({ courierConsignmentId: null });
  else if (f.courier) and.push({ courier: f.courier });
  if (f.confirm === "call") {
    and.push({ paymentMethod: "COD", status: "PENDING", codConfirmedAt: null });
  }
  if (f.from) and.push({ createdAt: { gte: dhakaDayStart(f.from) } });
  if (f.to) {
    const end = dhakaDayStart(f.to);
    end.setUTCDate(end.getUTCDate() + 1);
    and.push({ createdAt: { lt: end } });
  }
  if (f.q) {
    const q = f.q;
    const idTerm = q.replace(/^#/, "").toLowerCase();
    const digits = q.replace(/[^\d]/g, "");
    const or: Prisma.OrderWhereInput[] = [
      { id: { startsWith: idTerm } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { paymentEmail: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { address: { fullName: { contains: q, mode: "insensitive" } } },
      { trackingNumber: { contains: q, mode: "insensitive" } },
      { courierConsignmentId: { contains: q, mode: "insensitive" } },
    ];
    const no = parseOrderNo(q);
    if (no != null && no <= 2_147_483_647) or.push({ number: no });
    if (digits.length >= 4) {
      // Match the last digits so "01711…", "+8801711…" and "1711…" all hit.
      const tail = digits.slice(-10);
      or.push(
        { address: { phone: { contains: tail } } },
        { user: { phone: { contains: tail } } },
        { paymentSenderNumber: { contains: tail } },
      );
    }
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}

/** Query string for the orders page with some filters changed. */
export function ordersHref(f: OrderFilters, change: Partial<OrderFilters> = {}) {
  const next = { ...f, page: 1, ...change };
  const sp = new URLSearchParams();
  if (next.status) sp.set("status", next.status);
  if (next.q) sp.set("q", next.q);
  if (next.method) sp.set("method", next.method);
  if (next.courier) sp.set("courier", next.courier);
  if (next.confirm) sp.set("confirm", next.confirm);
  if (next.from) sp.set("from", next.from);
  if (next.to) sp.set("to", next.to);
  if (next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

/** Customer-facing short order number. */

