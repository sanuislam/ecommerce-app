import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { hasRealEmail } from "@/lib/account";

const schema = z.object({
  currentPassword: z.string().max(200).optional().default(""),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

/**
 * Changes the password (needs the current one; every session ends), or sets
 * a first one for an account made with a mobile code or Google — which then
 * can also sign in with its e-mail and this password.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!(await rateLimit(`password:${session.user.id}`, 5, 900))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);

  if (!user.passwordHash) {
    if (!hasRealEmail(user.email)) {
      return NextResponse.json({ error: "Add and confirm your e-mail first — you'll sign in with it." }, { status: 400 });
    }
    // Conditional: two tabs can't both "set" (the second would skip the current-password check).
    const r = await prisma.user.updateMany({ where: { id: session.user.id, passwordHash: null }, data: { passwordHash: hash } });
    if (r.count !== 1) return NextResponse.json({ error: "A password is already set. Refresh the page." }, { status: 409 });
    return NextResponse.json({ ok: true, set: true });
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hash, passwordChangedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
