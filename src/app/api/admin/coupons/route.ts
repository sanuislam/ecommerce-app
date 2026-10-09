import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  checkCoupon,
  couponFields,
  firstIssue,
  isUniqueViolation,
} from "./_lib/schema";
import { audit } from "@/lib/audit";

/** The session when it may manage coupons, else null. */
async function isAdmin() {
  const session = await auth();
  return session?.user && can(session.user.role, session.user.staffRole, "coupons") ? session : null;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}

export async function POST(req: Request) {
  const session = await isAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = couponFields.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const problem = checkCoupon(parsed.data);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const coupon = await prisma.coupon.create({ data: parsed.data });
    await audit(session, { action: "coupon.create", targetType: "coupon", targetId: coupon.id, summary: `Coupon ${coupon.code} created`, data: parsed.data });
    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: `A coupon with code ${parsed.data.code} already exists` },
        { status: 409 },
      );
    }
    console.error("create coupon failed", err);
    return NextResponse.json({ error: "Could not create coupon" }, { status: 500 });
  }
}
