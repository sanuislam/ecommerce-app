import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bdMobile } from "@/lib/sms";
import { getSiteSettings } from "@/lib/site-settings";
import { mailReady, sendMail } from "@/lib/mailer";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().max(20).default(""),
  email: z.string().trim().max(200).default(""),
  orderRef: z.string().trim().max(30).default(""),
  message: z.string().trim().min(10, "Write a little more (10 characters at least)").max(2000),
  website: z.string().max(200).default(""), // honeypot
});

/** Contact form: saved for the team (Admin → Messages) and e-mailed to support when e-mail works. */
export async function POST(req: Request) {
  const ip = await clientIp().catch(() => "unknown");
  if (!(await rateLimit(`contact:${ip}`, 5, 3600))) {
    return NextResponse.json({ error: "Too many messages. Please try again later or call us." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const v = parsed.data;
  if (v.website) return NextResponse.json({ ok: true }); // bot
  const phone = v.phone ? bdMobile(v.phone) : null;
  if (v.phone && !phone) return NextResponse.json({ error: "Enter a valid mobile number (01XXXXXXXXX)" }, { status: 400 });
  const email = v.email && z.string().email().safeParse(v.email).success ? v.email.toLowerCase() : "";
  if (v.email && !email) return NextResponse.json({ error: "Enter a valid e-mail" }, { status: 400 });
  if (!phone && !email) return NextResponse.json({ error: "Give a mobile number or an e-mail so we can reply" }, { status: 400 });
  const session = await auth();
  const msg = await prisma.contactMessage.create({
    data: { name: v.name, phone: phone ?? "", email, orderRef: v.orderRef, message: v.message, userId: session?.user?.id ?? null, ip },
  });
  const site = await getSiteSettings();
  if (site.supportEmail && mailReady()) {
    await sendMail(
      site.supportEmail,
      `New message from ${v.name}${v.orderRef ? ` (order ${v.orderRef})` : ""}`,
      `${v.message}\n\nName: ${v.name}\nPhone: ${phone ?? "-"}\nE-mail: ${email || "-"}\n\nOpen: ${siteUrl()}/admin/messages`,
    ).catch(() => false);
  }
  return NextResponse.json({ ok: true, id: msg.id });
}
