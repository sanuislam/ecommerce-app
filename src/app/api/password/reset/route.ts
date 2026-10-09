import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { MIN_PASSWORD, redeemResetToken } from "@/lib/password-reset";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20).max(100),
  password: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`).max(200),
});

/** Sets a new password with a one-time reset link. Signs the account out everywhere. */
export async function POST(req: Request) {
  const ip = await clientIp().catch(() => "unknown");
  if (!(await rateLimit(`reset:ip:${ip}`, 20, 3600))) {
    return NextResponse.json({ error: "Too many tries. Wait a while." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const done = await redeemResetToken(parsed.data.token, parsed.data.password);
  if (!done) {
    return NextResponse.json({ error: "This link has expired or was already used. Ask for a new one." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: done.userId }, select: { id: true, email: true, role: true } });
  if (user && user.role !== "USER") {
    await audit({ user: { id: user.id, email: user.email } }, {
      action: "security.password_reset",
      targetType: "user",
      targetId: user.id,
      summary: "Password set with a reset link",
    });
  }
  return NextResponse.json({ ok: true });
}
