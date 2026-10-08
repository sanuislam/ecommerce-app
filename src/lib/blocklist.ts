import "server-only";
import { prisma } from "@/lib/prisma";
import { bdMobile } from "@/lib/sms";

/** Blocked from cash on delivery? */
export async function isPhoneBlocked(raw: string | null | undefined): Promise<boolean> {
  const phone = bdMobile(raw);
  if (!phone) return false;
  return !!(await prisma.blockedPhone.findUnique({ where: { phone }, select: { id: true } }));
}

export async function blockPhone(raw: string, reason: string, byId?: string) {
  const phone = bdMobile(raw);
  if (!phone) throw new Error("Not a valid 01XXXXXXXXX number");
  return prisma.blockedPhone.upsert({
    where: { phone },
    create: { phone, reason: reason.slice(0, 200), createdById: byId ?? null },
    update: { reason: reason.slice(0, 200) },
  });
}
