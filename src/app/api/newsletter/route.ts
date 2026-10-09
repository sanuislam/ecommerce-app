import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { mailReady, sendMail } from "@/lib/mailer";
import { getSeoSettings } from "@/lib/seo-settings";
import { siteUrl } from "@/lib/site-url";

const schema = z.object({
  email: z.string().trim().email().max(200),
});

/**
 * Newsletter sign-up. When the shop set a welcome coupon (Admin → Settings),
 * the answer carries it so the page can show it, and it is e-mailed too when
 * e-mail is set up.
 */
export async function POST(req: Request) {
  const ip = await clientIp().catch(() => "unknown");
  if (!(await rateLimit(`newsletter:${ip}`, 10, 3600))) {
    return NextResponse.json({ error: "Too many tries. Please try later." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid e-mail address" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!existing) await prisma.newsletterSubscriber.create({ data: { email } });
    const site = await getSiteSettings();
    const coupon = site.newsletterCoupon || null;
    if (coupon && !existing && mailReady()) {
      const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
      await sendMail(
        email,
        `Your ${shop} welcome code`,
        `Thanks for joining ${shop}!\n\nUse code ${coupon} at checkout: ${siteUrl()}/products\n\nTerms are shown at checkout when you apply it.`,
      );
    }
    return NextResponse.json({ ok: true, coupon, already: !!existing });
  } catch {
    return NextResponse.json({ error: "Could not subscribe" }, { status: 500 });
  }
}
