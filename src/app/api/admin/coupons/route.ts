import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import {
  checkCoupon,
  couponFields,
  firstIssue,
  isUniqueViolation,
} from "./_lib/schema";

async function isAdmin() {
  const session = await auth();
  return session?.user?.role === Role.ADMIN;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
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
