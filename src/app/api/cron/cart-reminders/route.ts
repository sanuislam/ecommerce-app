import { NextResponse } from "next/server";
import { autoRemindCarts } from "@/lib/carts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily abandoned-cart reminders (only when turned on in Admin → Abandoned
 * carts). Vercel Cron calls it at 05:00 UTC = 11:00 in Dhaka.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await autoRemindCarts());
}
