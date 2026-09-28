import { NextResponse } from "next/server";
import { expireStaleOrders } from "@/lib/orders";
import { pruneRateLimits } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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
  return NextResponse.json({ cancelled });
}
