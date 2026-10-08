import { prisma } from "@/lib/prisma";
import { adminSession } from "@/lib/admin-auth";
import { orderWhere, parseOrderFilters, SOURCE_LABEL } from "@/lib/admin-orders";
import { STATUS_LABEL } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 10_000;

// Spreadsheet-safe cell: quoted, and formula-looking text prefixed with '.
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const dhaka = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", "");

/** CSV of every order matching the list's filters (or the given ids). */
export async function GET(req: Request) {
  if (!(await adminSession())) return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 500);
  const where = ids.length ? { id: { in: ids } } : orderWhere(parseOrderFilters(url.searchParams));

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: {
      address: true,
      user: { select: { email: true, name: true, phone: true } },
      items: { select: { name: true, variantName: true, quantity: true } },
    },
  });

  const header = [
    "Order", "Placed (Dhaka)", "Status", "Source", "Customer", "Phone", "Email", "District",
    "Area", "Address", "Items", "Qty", "Subtotal", "Discount", "Delivery", "Total",
    "Payment", "TrxID", "Courier", "Consignment", "Tracking", "Courier status", "Coupon", "Note",
  ];
  const rows = orders.map((o) => [
    o.id.slice(0, 8),
    dhaka(o.createdAt),
    STATUS_LABEL[o.status],
    SOURCE_LABEL[o.source] ?? o.source,
    o.address?.fullName || o.user.name || "",
    o.address?.phone || o.user.phone || "",
    o.paymentEmail || o.user.email,
    o.address?.state ?? "",
    o.address?.city ?? "",
    [o.address?.line1, o.address?.line2].filter(Boolean).join(", "),
    o.items.map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity}`).join("; "),
    o.items.reduce((n, i) => n + i.quantity, 0),
    Number(o.subtotal).toFixed(2),
    Number(o.discount).toFixed(2),
    Number(o.shipping).toFixed(2),
    Number(o.total).toFixed(2),
    o.paymentMethod,
    o.paymentTransactionId ?? "",
    o.courier ?? "",
    o.courierConsignmentId ?? "",
    o.trackingNumber ?? "",
    o.courierStatus ?? "",
    o.couponCode ?? "",
    o.notes ?? "",
  ]);
  // BOM so Excel opens the UTF-8 (Bangla names) correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
