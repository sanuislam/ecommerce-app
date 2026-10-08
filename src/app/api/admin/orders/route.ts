import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { createAdminOrder, createOrderSchema, OrderWriteError } from "@/lib/admin-order-write";

export const dynamic = "force-dynamic";

/** Creates an order typed in by an admin (phone / Facebook / WhatsApp…). */
export async function POST(req: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = createOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const order = await createAdminOrder(parsed.data, session.user.id);
    return NextResponse.json({ id: order.id }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderWriteError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
