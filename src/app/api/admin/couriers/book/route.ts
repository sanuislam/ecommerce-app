import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { bookOrder, COURIERS } from "@/lib/couriers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string().min(1).max(40)).min(1).max(50),
  courier: z.enum(COURIERS),
  options: z
    .object({
      pathaoCity: z.number().int().positive().optional(),
      pathaoZone: z.number().int().positive().optional(),
      pathaoArea: z.number().int().positive().optional(),
      redxAreaId: z.number().int().positive().optional(),
      redxAreaName: z.string().max(120).optional(),
      weightKg: z.number().min(0.1).max(30).optional(),
      note: z.string().max(200).optional(),
    })
    .optional(),
});

/** Books orders with a courier, one by one (each result reported). */
export async function POST(req: Request) {
  const session = await adminSession("orders");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { ids, courier, options } = parsed.data;
  // Area choices only make sense for a single order.
  const opts = ids.length === 1 ? options : { weightKg: options?.weightKg };

  const results = [];
  for (const id of [...new Set(ids)]) {
    const r = await bookOrder(id, courier, opts);
    results.push({ id, ...r });
  }
  for (const r of results.filter((x) => x.ok)) {
    await audit(session, { action: "order.courier_book", targetType: "order", targetId: r.id, summary: `#${r.id.slice(0, 8)} booked with ${courier}` });
  }
  return NextResponse.json({
    booked: results.filter((r) => r.ok).length,
    results,
  });
}
