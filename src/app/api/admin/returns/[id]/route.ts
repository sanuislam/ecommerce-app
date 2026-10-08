import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import {
  approveReturn,
  completeReturn,
  createReplacementOrder,
  isReturnError,
  receiveReturn,
  refundReturn,
  rejectReturn,
} from "@/lib/returns";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), note: z.string().trim().max(300).optional().default("") }),
  z.object({ action: z.literal("reject"), note: z.string().trim().max(300).optional().default("") }),
  z.object({ action: z.literal("receive"), restock: z.boolean() }),
  z.object({
    action: z.literal("refund"),
    amount: z.number().positive().max(10_000_000),
    method: z.string().trim().min(1).max(40),
    reference: z.string().trim().max(80).optional().default(""),
    viaGateway: z.boolean(),
  }),
  z.object({ action: z.literal("replacement"), deliveryCharge: z.number().min(0).max(100_000) }),
  z.object({ action: z.literal("complete") }),
]);

export async function POST(req: Request, ctx: Ctx) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const b = parsed.data;
  try {
    switch (b.action) {
      case "approve":
        await approveReturn(id, b.note);
        break;
      case "reject":
        await rejectReturn(id, b.note);
        break;
      case "receive":
        await receiveReturn(id, b.restock);
        break;
      case "refund":
        await refundReturn(id, { amount: b.amount, method: b.method, reference: b.reference, viaGateway: b.viaGateway });
        break;
      case "replacement": {
        const o = await createReplacementOrder(id, b.deliveryCharge, session.user.id);
        return NextResponse.json({ ok: true, orderId: o.id });
      }
      case "complete":
        await completeReturn(id);
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isReturnError(err)) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
