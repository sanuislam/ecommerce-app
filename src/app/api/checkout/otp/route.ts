import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sendOtp } from "@/lib/otp";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";

/** Sends the cash-on-delivery confirmation code to the delivery phone. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = z.object({ phone: z.string().min(1).max(20) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your mobile number" }, { status: 400 });
  const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
  const r = await sendOtp(parsed.data.phone, "cod", session.user.id, shop);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
