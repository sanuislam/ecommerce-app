import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Owner: require two-factor sign-in for everyone in the admin panel. */
export async function PUT(req: Request) {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ require2fa: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (parsed.data.require2fa) {
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorEnabledAt: true } });
    if (!me?.twoFactorEnabledAt) {
      return NextResponse.json({ error: "Turn on two-factor for your own account first (My security)" }, { status: 400 });
    }
  }
  await prisma.adminSettings.upsert({
    where: { id: "default" },
    create: { id: "default", require2fa: parsed.data.require2fa },
    update: { require2fa: parsed.data.require2fa },
  });
  await audit(session, {
    action: "settings.security",
    summary: parsed.data.require2fa ? "Two-factor required for the admin panel" : "Two-factor no longer required",
    data: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
