import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hashRecovery, newRecoveryCodes, openSecret, sealSecret, verifyTotp } from "@/lib/totp";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Step 2: the first code from the app turns two-factor on. Recovery codes are shown once. */
export async function POST(req: Request) {
  const session = await adminUser();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z
    .object({ pending: z.string().min(10).max(1000), code: z.string().trim().max(10) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type the 6-digit code" }, { status: 400 });

  let p: { u?: string; s?: string; e?: number } = {};
  try {
    p = JSON.parse(openSecret(parsed.data.pending) ?? "{}");
  } catch {}
  if (p.u !== session.user.id || !p.s || !p.e || p.e < Date.now()) {
    return NextResponse.json({ error: "This setup expired. Start again." }, { status: 400 });
  }
  if (!verifyTotp(p.s, parsed.data.code.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "That code didn't match. Check the phone's clock and use the newest code." }, { status: 400 });
  }
  const codes = newRecoveryCodes();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorSecret: sealSecret(p.s),
      twoFactorEnabledAt: new Date(),
      twoFactorRecovery: codes.map(hashRecovery),
    },
  });
  await audit(session, { action: "security.2fa_on", targetType: "user", targetId: session.user.id, summary: "Two-factor sign-in turned on" });
  return NextResponse.json({ ok: true, recoveryCodes: codes });
}
