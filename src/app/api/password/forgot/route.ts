import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createResetLink, RESET_TTL_MIN } from "@/lib/password-reset";
import { mailReady, sendMail } from "@/lib/mailer";
import { bdMobile, getSmsSettings, sendSms } from "@/lib/sms";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";

const SAME = {
  ok: true,
  message: "If an account uses that e-mail, we've sent it a link to set a new password. It works for 60 minutes.",
};

/**
 * "Forgot password". Always answers the same, whether or not the account
 * exists, and sends in the background so the timing says nothing either.
 * The link goes by e-mail (Resend) or, without e-mail, by SMS to the
 * account's phone.
 */
export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().email().max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your e-mail address" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const ip = await clientIp().catch(() => "unknown");
  if (!(await rateLimit(`forgot:ip:${ip}`, 10, 3600)) || !(await rateLimit(`forgot:email:${email}`, 3, 3600))) {
    return NextResponse.json(SAME);
  }

  after(async () => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, phone: true, name: true } });
    if (!user || email.endsWith(".invalid")) return;
    const link = await createResetLink(user.id);
    const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
    if (mailReady()) {
      const text = `Hello${user.name ? ` ${user.name}` : ""},\n\nSomeone asked to reset the password of your ${shop} account. Open this link to choose a new one (it works for ${RESET_TTL_MIN} minutes, once):\n\n${link}\n\nIf it wasn't you, ignore this e-mail; your password stays the same.`;
      if (await sendMail(email, `Reset your ${shop} password`, text)) return;
    }
    const phone = bdMobile(user.phone);
    const sms = await getSmsSettings();
    if (phone && sms.enabled && sms.apiKey) {
      await sendSms(sms.apiKey, phone, `${shop}: reset your password here (60 min): ${link}`, sms.senderId || undefined);
    }
  });
  return NextResponse.json(SAME);
}
