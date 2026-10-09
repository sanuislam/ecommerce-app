import { adminSession } from "@/lib/admin-auth";
import { exportProductsCsv } from "@/lib/product-csv";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await adminSession("products");
  if (!session) return new Response("Forbidden", { status: 403 });
  const csv = await exportProductsCsv();
  await audit(session, { action: "product.export", summary: "Products exported to CSV" });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
