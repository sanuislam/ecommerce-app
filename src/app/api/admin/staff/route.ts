import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, STAFF_ROLE_IDS } from "@/lib/permissions";
import { createResetLink } from "@/lib/password-reset";
import { mailReady, sendMail } from "@/lib/mailer";
import { audit } from "@/lib/audit";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";
const INVITE_TTL_MIN = 7 * 24 * 60;

const schema = z.object({
  email: z.string().trim().email("Enter a valid e-mail").max(200),
  name: z.string().trim().max(80).optional().default(""),
  staffRole: z.enum(STAFF_ROLE_IDS as [string, ...string[]]),
});

/**
 * Adds a staff member (owner only). An existing customer account is
 * promoted; a new e-mail gets an account without a password and a
 * one-time link (7 days) to set one.
 */
export async function POST(req: Request) {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  if (email.endsWith(".invalid")) return NextResponse.json({ error: "Use a real e-mail address" }, { status: 400 });
  const role = parsed.data.staffRole as keyof typeof STAFF_ROLES;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.role === "ADMIN") return NextResponse.json({ error: "This person is already an owner" }, { status: 409 });
  if (existing?.role === "STAFF") return NextResponse.json({ error: "Already on the staff list" }, { status: 409 });

  let link: string | null = null;
  let emailed = false;
  let userId: string;
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: "STAFF", staffRole: role } });
    userId = existing.id;
  } else {
    const created = await prisma.user.create({
      data: { email, name: parsed.data.name || null, role: "STAFF", staffRole: role },
    });
    userId = created.id;
    link = await createResetLink(created.id, INVITE_TTL_MIN);
    const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
    if (mailReady()) {
      emailed = await sendMail(
        email,
        `You've been added to ${shop}`,
        `Hello${parsed.data.name ? ` ${parsed.data.name}` : ""},\n\nYou've been added to the ${shop} admin panel as ${STAFF_ROLES[role].label}. Open this link to set your password (it works once, for 7 days):\n\n${link}\n\nThen sign in at ${new URL(link).origin}/sign-in.`,
      );
    }
  }
  await audit(session, {
    action: "staff.add",
    targetType: "user",
    targetId: userId,
    summary: `${email} added as ${STAFF_ROLES[role].label}${existing ? " (existing account)" : ""}`,
    data: { email, staffRole: role, newAccount: !existing },
  });
  return NextResponse.json({ ok: true, link, emailed });
}
