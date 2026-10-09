import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@/generated/prisma";
import { adminSession } from "@/lib/admin-auth";
import { adminChangeStatus } from "@/lib/admin-order-actions";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string().min(1).max(40)).min(1).max(200),
  action: z.literal("status"),
  status: z.nativeEnum(OrderStatus),
  note: z.string().trim().max(300).optional(),
});

/** Changes many orders at once; each one is checked like a single change. */
export async function POST(req: Request) {
  const session = await adminSession("orders");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { ids, status, note } = parsed.data;

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of [...new Set(ids)]) {
    const r = await adminChangeStatus({ orderId: id, status, note });
    results.push(r.ok ? { id, ok: true } : { id, ok: false, error: r.error });
  }
  const done = results.filter((r) => r.ok);
  if (done.length) {
    await audit(session, {
      action: "order.bulk",
      summary: `${done.length} order(s) → ${status}${note ? ` (${note})` : ""}`,
      data: { status, ids: done.map((r) => r.id), failed: results.length - done.length },
    });
  }
  return NextResponse.json({
    done: done.length,
    failed: results.filter((r) => !r.ok),
  });
}
