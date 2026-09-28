import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { transitionOrder } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

/** Lets a customer cancel their own order before it is paid or shipped. */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (!customerCanCancel(order)) {
    return NextResponse.json(
      { error: "This order can no longer be cancelled online. Please contact us." },
      { status: 400 },
    );
  }
  const ok = await transitionOrder({
    orderId: id,
    from: "PENDING",
    to: "CANCELLED",
    note: "Cancelled by customer",
  });
  if (!ok) {
    return NextResponse.json({ error: "Order status changed. Please refresh." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

function customerCanCancel(o: { status: string; paymentTransactionId: string | null }) {
  // Once money has been sent (manual MFS TrxID) a person must handle the refund.
  return o.status === "PENDING" && !o.paymentTransactionId;
}
