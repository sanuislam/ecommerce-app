import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { editAdminOrder, editOrderSchema, OrderWriteError } from "@/lib/admin-order-write";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await adminSession("orders");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = editOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const r = await editAdminOrder(id, parsed.data, session.user.id);
    await audit(session, {
      action: "order.edit",
      targetType: "order",
      targetId: id,
      summary: `#${id.slice(0, 8)}: details, products or charges edited`,
      data: { items: parsed.data.items, shipping: parsed.data.shipping, discount: parsed.data.discount },
    });
    return NextResponse.json(r);
  } catch (err) {
    if (err instanceof OrderWriteError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
