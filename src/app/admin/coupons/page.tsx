import { prisma } from "@/lib/prisma";
import {
  CouponManager,
  type CouponView,
} from "@/components/admin/coupon-manager";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date().getTime();
  const coupons: CouponView[] = rows.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: Number(c.value),
    minSubtotal: Number(c.minSubtotal),
    maxDiscount: c.maxDiscount != null ? Number(c.maxDiscount) : null,
    usageLimit: c.usageLimit,
    perUserLimit: c.perUserLimit,
    usedCount: c.usedCount,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    active: c.active,
  }));

  return (
    <div className="p-4 sm:p-6">
      <CouponManager coupons={coupons} now={now} />
    </div>
  );
}
