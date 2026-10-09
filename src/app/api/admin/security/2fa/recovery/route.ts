import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { checkPassword, checkSecondFactor } from "@/lib/security";
import { hashRecovery, newRecoveryCodes } from "@/lib/totp";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** New recovery codes (the old ones stop working). */
export async function POST(req: Request) {
  const session = await adminUser();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z
    .object({ password: z.string().min(1).max(200), code: z.string().trim().min(6).max(20) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type your password and a code" }, { status: 400 });
  if (!(await checkPassword(session.user.id, parsed.data.password))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 400 });
  }
  if (!(await checkSecondFactor(session.user.id, parsed.data.code))) {
    return NextResponse.json({ error: "That code didn't work" }, { status: 400 });
  }
  const codes = newRecoveryCodes();
  await prisma.user.update({ where: { id: session.user.id }, data: { twoFactorRecovery: codes.map(hashRecovery) } });
  await audit(session, { action: "security.recovery", targetType: "user", targetId: session.user.id, summary: "New recovery codes made" });
  return NextResponse.json({ ok: true, recoveryCodes: codes });
}
