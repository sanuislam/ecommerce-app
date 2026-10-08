import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { createReturn, isReturnError, RETURN_REASONS } from "@/lib/returns";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderId: z.string().min(1),
  type: z.enum(["RETURN", "EXCHANGE"]),
  reason: z.enum(RETURN_REASONS),
  note: z.string().trim().max(500).optional().default(""),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().min(0).max(50),
        exchangeVariantId: z.string().min(1).nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/** An admin opens a return / exchange for a customer (approved straight away, no time limit). */
export async function POST(req: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const { orderId, ...input } = parsed.data;
  try {
    const r = await createReturn(orderId, input, { admin: true, userId: session.user.id });
    return NextResponse.json({ id: r.id }, { status: 201 });
  } catch (err) {
    if (isReturnError(err)) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
