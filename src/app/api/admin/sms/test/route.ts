import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { bdMobile, getSmsSettings, sendSms, smsBalance } from "@/lib/sms";

export const dynamic = "force-dynamic";

/** Shows the balance, or sends a test message to `to`. */
export async function POST(req: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ to: z.string().optional() }).safeParse(await req.json().catch(() => ({})));
  const s = await getSmsSettings();
  if (!s.apiKey) return NextResponse.json({ ok: false, message: "Save the API key first" }, { status: 400 });
  const to = parsed.success && parsed.data.to ? bdMobile(parsed.data.to) : null;
  if (parsed.success && parsed.data.to && !to) {
    return NextResponse.json({ ok: false, message: "Enter a valid 01XXXXXXXXX number" }, { status: 400 });
  }
  if (to) {
    const r = await sendSms(s.apiKey, to, "Test message from your shop's SMS settings.", s.senderId || undefined);
    return r.ok
      ? NextResponse.json({ ok: true, message: `Test SMS sent to ${to}` })
      : NextResponse.json({ ok: false, message: r.error }, { status: 502 });
  }
  const b = await smsBalance(s.apiKey);
  return b.ok
    ? NextResponse.json({ ok: true, message: `Connected · balance ৳${Number(b.balance ?? 0).toFixed(2)}` })
    : NextResponse.json({ ok: false, message: b.error }, { status: 502 });
}
