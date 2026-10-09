import { adminSession } from "@/lib/admin-auth";
import { daily, parseRange, topProducts } from "@/lib/reports";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Spreadsheet-safe cell: quoted, and formulas (= + - @) neutralised. */
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const session = await adminSession("reports");
  if (!session) return new Response("Forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const range = parseRange(sp);
  const type = sp.type === "products" ? "products" : "daily";
  let rows: unknown[][];
  if (type === "products") {
    const list = await topProducts(range, 5000);
    rows = [
      ["Product", "Category", "Units", "Orders", "Sales", "Cost", "Profit"],
      ...list.map((p) => [p.name, p.category, p.units, p.orders, p.revenue.toFixed(2), p.cost?.toFixed(2) ?? "", p.profit?.toFixed(2) ?? ""]),
    ];
  } else {
    const list = await daily(range);
    rows = [["Day", "Orders", "Sales"], ...list.map((d) => [d.day, d.orders, d.sales.toFixed(2)])];
  }
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  await audit(session, { action: "report.export", summary: `${type} report ${range.from} → ${range.to} exported` });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eidbazar-${type}-${range.from}-to-${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
