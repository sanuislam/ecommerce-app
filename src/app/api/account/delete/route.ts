import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { OPEN_ORDER_STATUSES } from "@/lib/account";

const schema = z.object({
  confirm: z.literal("DELETE", { message: 'Type DELETE to confirm' }),
  password: z.string().max(200).optional().default(""),
});

/**
 * Deletes the customer's account: personal details are wiped and sign-in
 * stops working. Past orders stay (the shop must keep its sales records),
 * so the row itself is kept, anonymised. Not while an order or a return is
 * still open.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!(await rateLimit(`delete-account:${session.user.id}`, 5, 900))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, passwordHash: true, deletedAt: true } });
  if (!user || user.deletedAt) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (user.role !== "USER") {
    return NextResponse.json({ error: "Staff accounts are removed by the shop owner." }, { status: 403 });
  }
  if (user.passwordHash && !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Password is incorrect" }, { status: 400 });
  }
  const [openOrders, openReturns] = await Promise.all([
    prisma.order.count({ where: { userId, status: { in: [...OPEN_ORDER_STATUSES] } } }),
    prisma.returnRequest.count({ where: { order: { userId }, status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } }),
  ]);
  if (openOrders || openReturns) {
    return NextResponse.json(
      { error: "You have an order or a return still in progress. You can delete your account once it's finished." },
      { status: 409 },
    );
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.invalid`,
        emailVerified: null,
        name: null,
        firstName: null,
        lastName: null,
        phone: null,
        image: null,
        passwordHash: null,
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
        twoFactorRecovery: [],
        smsOptOut: true,
        deletedAt: now,
        passwordChangedAt: now,
      },
    }),
    prisma.address.updateMany({ where: { userId }, data: { archived: true, isDefault: false } }),
    prisma.wishlistItem.deleteMany({ where: { userId } }),
    prisma.cart.deleteMany({ where: { userId } }),
    prisma.cartSnapshot.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.passwordReset.deleteMany({ where: { userId } }),
    prisma.stockAlert.deleteMany({ where: { userId } }),
  ]);
  return NextResponse.json({ ok: true });
}
