import { NextResponse } from "next/server";
import { expireStaleOrders } from "@/lib/orders";
import { pruneRateLimits } from "@/lib/rate-limit";
import { syncShippedOrders } from "@/lib/couriers";
import { notifyBackInStock } from "@/lib/stock-alerts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cancels abandoned online-payment orders and returns their stock.
 * Called by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cancelled = await expireStaleOrders(60);
  await pruneRateLimits().catch(() => {});
  // Courier webhooks are the main signal; this catches any that were missed.
  const couriers = await syncShippedOrders().catch(() => null);
  // Back-in-stock texts that the instant path missed.
  const waiting = await prisma.stockAlert.findMany({ where: { notifiedAt: null }, select: { productId: true }, distinct: ["productId"], take: 200 });
  const backInStock = await notifyBackInStock(waiting.map((w) => w.productId)).catch(() => 0);
  return NextResponse.json({ cancelled, couriers, backInStock });
}
