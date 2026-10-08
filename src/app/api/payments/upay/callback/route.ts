import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settleUpayOrder } from "@/lib/upay-settle";

export const dynamic = "force-dynamic";

/**
 * Upay sends the customer back here after the payment page, appending
 * `status` (success / failed / cancelled / pending / expired) and
 * `invoice_id` to our redirect_url — `?order=<id>`. The doc's sample appends
 * with "&" even after a path, so the order id is read defensively.
 *
 * Nothing in the query is trusted: the result is always read back from
 * Upay's status API (`settleUpayOrder`) before the order changes.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const base = url.origin;
  const go = (path: string) => NextResponse.redirect(`${base}${path}`, { status: 303 });

  // "abc123?status=success" (a second "?") or "abc123/" → "abc123".
  const pick = (v: string | null) => (v ?? "").match(/^[A-Za-z0-9_-]{1,50}/)?.[0] ?? "";
  const orderId = pick(url.searchParams.get("order")) || pick(url.searchParams.get("invoice_id"));
  if (!orderId) return go("/cart?upay=missing-id");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentMethod: true, upayTxnId: true },
  });
  if (!order || order.paymentMethod !== "UPAY" || !order.upayTxnId) return go("/cart?upay=order-not-found");

  if (order.status !== "PENDING") {
    return go(
      order.status === "CANCELLED" || order.status === "REFUNDED"
        ? `/orders/${order.id}?upay=${order.status.toLowerCase()}`
        : `/orders/${order.id}?success=1`,
    );
  }

  const outcome = await settleUpayOrder(order.id);
  switch (outcome) {
    case "paid":
      return go(`/orders/${order.id}?success=1`);
    case "review":
      return go(`/orders/${order.id}?upay=review`);
    case "cancelled":
      return go(`/orders/${order.id}?upay=failed`);
    default:
      // pending / not found / Upay unreachable: the order stays open; the
      // order page and the expiry job check again.
      return go(`/orders/${order.id}?upay=pending`);
  }
}

export const GET = handle;
// In case Upay posts the customer back instead of a GET redirect.
export const POST = handle;
