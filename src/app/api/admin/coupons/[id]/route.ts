import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  checkCoupon,
  couponFields,
  firstIssue,
  isUniqueViolation,
  rowToFields,
  type CouponFields,
} from "../_lib/schema";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/** The session when it may manage coupons, else null. */
async function isAdmin() {
  const session = await auth();
  return session?.user && can(session.user.role, session.user.staffRole, "coupons") ? session : null;
}

const patchSchema = couponFields.partial();

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await isAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  // Only apply keys the client actually sent (zod fills in defaults otherwise).
  const sent = new Set(Object.keys(body));
  const patch = Object.fromEntries(
    Object.entries(parsed.data).filter(([k]) => sent.has(k)),
  ) as Partial<CouponFields>;

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }
  const problem = checkCoupon({ ...rowToFields(existing), ...patch });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const coupon = await prisma.coupon.update({ where: { id }, data: patch });
    await audit(session, { action: "coupon.update", targetType: "coupon", targetId: id, summary: `Coupon ${coupon.code} changed`, data: patch });
    return NextResponse.json(coupon);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: `A coupon with code ${patch.code} already exists` },
        { status: 409 },
      );
    }
    console.error("update coupon failed", err);
    return NextResponse.json({ error: "Could not update coupon" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await isAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await prisma.coupon.findUnique({ where: { id }, select: { code: true } });
  const res = await prisma.coupon.deleteMany({ where: { id } });
  if (res.count === 0) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }
  await audit(session, { action: "coupon.delete", targetType: "coupon", targetId: id, summary: `Coupon ${existing?.code ?? id} deleted` });
  return NextResponse.json({ ok: true });
}
