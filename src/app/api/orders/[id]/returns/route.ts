import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isCustomerPhoto } from "@/lib/cloudinary";
import { cancelReturn, createReturn, isReturnError, RETURN_REASONS } from "@/lib/returns";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const returnBody = z.object({
  type: z.enum(["RETURN", "EXCHANGE"]),
  reason: z.enum(RETURN_REASONS),
  note: z.string().trim().max(500).optional().default(""),
  images: z
    .array(z.string().max(400))
    .max(4)
    .optional()
    .default([])
    .refine((a) => a.every((u) => isCustomerPhoto(u, "eidbazar/returns")), "Photos must be uploaded here"),
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

async function ownOrder(id: string) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Please sign in" }, { status: 401 }) };
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!order || order.userId !== session.user.id) {
    return { error: NextResponse.json({ error: "Order not found" }, { status: 404 }) };
  }
  return { session, order };
}

/** A customer asks to return or exchange items of a delivered order. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const own = await ownOrder(id);
  if ("error" in own) return own.error;
  if (!(await rateLimit(`return:${own.session.user.id}`, 5, 3600))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const parsed = returnBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  try {
    const r = await createReturn(id, parsed.data, { admin: false, userId: own.session.user.id });
    return NextResponse.json({ id: r.id }, { status: 201 });
  } catch (err) {
    if (isReturnError(err)) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

/** The customer withdraws a request that hasn't been reviewed yet. */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const own = await ownOrder(id);
  if ("error" in own) return own.error;
  const rid = new URL(req.url).searchParams.get("rid") ?? "";
  const r = await prisma.returnRequest.findFirst({ where: { id: rid, orderId: id } });
  if (!r) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  try {
    await cancelReturn(r.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isReturnError(err)) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
