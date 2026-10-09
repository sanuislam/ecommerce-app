import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { adminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { checkPassword } from "@/lib/security";
import { MIN_PASSWORD } from "@/lib/password-reset";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Changes the password. Every session (this one too) is signed out. */
export async function POST(req: Request) {
  const session = await adminUser();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z
    .object({
      current: z.string().min(1).max(200),
      next: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`).max(200),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (!(await checkPassword(session.user.id, parsed.data.current))) {
    return NextResponse.json({ error: "The current password is wrong" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10), passwordChangedAt: new Date() },
  });
  await prisma.passwordReset.deleteMany({ where: { userId: session.user.id, usedAt: null } });
  await audit(session, { action: "security.password", targetType: "user", targetId: session.user.id, summary: "Password changed" });
  return NextResponse.json({ ok: true });
}
