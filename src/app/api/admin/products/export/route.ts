import { adminSession } from "@/lib/admin-auth";
import { exportProductsCsv } from "@/lib/product-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await adminSession())) return new Response("Forbidden", { status: 403 });
  const csv = await exportProductsCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
