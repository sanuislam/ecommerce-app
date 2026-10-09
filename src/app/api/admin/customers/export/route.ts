import { adminSession } from "@/lib/admin-auth";
import { allCustomers, audienceLabel, parseAudience } from "@/lib/segments";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
const day = (d: Date | null) => (d ? d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }) : "");

export async function GET(req: Request) {
  const session = await adminSession("customers");
  if (!session) return new Response("Forbidden", { status: 403 });
  const a = parseAudience(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await allCustomers(a);
  const lines = [
    ["Name", "Email", "Phone", "District", "Orders", "Spent", "First order", "Last order", "Joined", "Promo SMS"],
    ...rows.map((c) => [
      c.name ?? "",
      c.email.endsWith(".invalid") ? "" : c.email,
      c.phone ?? "",
      c.district ?? "",
      c.orders,
      c.spent.toFixed(2),
      day(c.firstOrder),
      day(c.lastOrder),
      day(c.createdAt),
      c.smsOptOut ? "no" : "yes",
    ]),
  ];
  await audit(session, { action: "customer.export", summary: `${rows.length} customers exported (${audienceLabel(a)})` });
  return new Response("﻿" + lines.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eidbazar-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
