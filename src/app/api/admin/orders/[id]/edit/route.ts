import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { editAdminOrder, editOrderSchema, OrderWriteError } from "@/lib/admin-order-write";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = editOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json(await editAdminOrder(id, parsed.data, session.user.id));
  } catch (err) {
    if (err instanceof OrderWriteError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
