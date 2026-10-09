import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";

/** Sends the 6-digit sign-in code by SMS (sign-in and sign-up are the same step). */
export async function POST(req: Request) {
  const parsed = z.object({ phone: z.string().min(1).max(20) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your mobile number" }, { status: 400 });
  const ip = await clientIp().catch(() => "unknown");
  if (!(await rateLimit(`logincode:ip:${ip}`, 10, 3600))) {
    return NextResponse.json({ error: "Too many codes requested. Try again later." }, { status: 429 });
  }
  const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
  const r = await sendOtp(parsed.data.phone, "login", `ip:${ip}`, shop);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
