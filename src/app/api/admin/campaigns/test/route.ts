import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { bdMobile, getSmsSettings, sendSms } from "@/lib/sms";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Sends the draft to one number (yours) to see how it looks on a phone. */
export async function POST(req: Request) {
  const session = await adminSession("marketing");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z
    .object({ phone: z.string().max(20), message: z.string().trim().min(1).max(612) })
    .safeParse(await req.json().catch(() => null));
  const phone = parsed.success ? bdMobile(parsed.data.phone) : null;
  if (!parsed.success || !phone) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
  if (!(await rateLimit(`campaigntest:${session.user.id}`, 10, 3600))) {
    return NextResponse.json({ error: "Too many tests. Try again later." }, { status: 429 });
  }
  const s = await getSmsSettings();
  if (!s.enabled || !s.apiKey) return NextResponse.json({ error: "Set up SMS first (Admin → SMS)" }, { status: 400 });
  const r = await sendSms(s.apiKey, phone, parsed.data.message, s.senderId || undefined);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 502 });
}
