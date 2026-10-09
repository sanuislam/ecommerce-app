import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { createAdminOrder, createOrderSchema, OrderWriteError } from "@/lib/admin-order-write";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Creates an order typed in by an admin (phone / Facebook / WhatsApp…). */
export async function POST(req: Request) {
  const session = await adminSession("orders");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = createOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const order = await createAdminOrder(parsed.data, session.user.id);
    await audit(session, {
      action: "order.create",
      targetType: "order",
      targetId: order.id,
      summary: `#${order.id.slice(0, 8)} typed in (${parsed.data.source}), ৳${Number(order.total)}`,
    });
    return NextResponse.json({ id: order.id }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderWriteError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
