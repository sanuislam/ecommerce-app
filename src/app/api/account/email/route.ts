import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { mailReady, sendMail } from "@/lib/mailer";
import { emailVerifyLink } from "@/lib/email-verify";
import { getSeoSettings } from "@/lib/seo-settings";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid e-mail").max(120) });

/** Sends a confirmation link to a new e-mail; the address changes only when it's clicked. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!mailReady()) return NextResponse.json({ error: "E-mail isn't set up on this shop yet." }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const email = parsed.data.email;
  if (email.endsWith(".invalid")) return NextResponse.json({ error: "Enter a valid e-mail" }, { status: 400 });
  if (!(await rateLimit(`emailchange:${session.user.id}`, 4, 3600))) {
    return NextResponse.json({ error: "Too many tries. Try again in an hour." }, { status: 429 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, role: true } });
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  // Staff e-mails are changed by an owner in the admin panel.
  if (user.role !== "USER") return NextResponse.json({ error: "Staff e-mails are changed in the admin panel." }, { status: 403 });
  if (user.email === email) return NextResponse.json({ error: "That's already your e-mail." }, { status: 400 });
  // Same answer whether or not another account has it (checked again on confirm).
  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!taken) {
    const shop = (await getSeoSettings()).siteName || "Eid Bazar";
    const link = emailVerifyLink(session.user.id, email, user.email);
    const sent = await sendMail(
      email,
      `Confirm your e-mail for ${shop}`,
      `Click the link below to use this e-mail on your ${shop} account. It works for 24 hours.\n\n${link}\n\nIf you didn't ask for this, ignore this e-mail.`,
    );
    if (!sent) return NextResponse.json({ error: "Couldn't send the e-mail. Try again later." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
