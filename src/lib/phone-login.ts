import "server-only";
import { prisma } from "@/lib/prisma";
import { bdMobile } from "@/lib/sms";

export class StaffMustUsePassword extends Error {}

/**
 * The customer account for a phone that just proved itself with an SMS
 * code: the oldest customer account whose OWN phone is this number (an
 * address phone is not enough — it may be a gift recipient's), or a new
 * account. Shop staff must sign in with e-mail, password and two-factor.
 */
export async function userForPhone(rawPhone: string, name?: string | null) {
  const phone = bdMobile(rawPhone);
  if (!phone) return null;
  const tail = phone.slice(-10);
  const matches = await prisma.user.findMany({
    where: { phone: { endsWith: tail } },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  const own = matches.filter((u) => bdMobile(u.phone) === phone);
  if (own.some((u) => u.role !== "USER") && !own.some((u) => u.role === "USER")) throw new StaffMustUsePassword();
  const existing = own.find((u) => u.role === "USER");
  if (existing) return existing;
  const email = `${phone}@phone.invalid`;
  try {
    return await prisma.user.create({ data: { phone, email, name: name?.trim() || null } });
  } catch {
    return prisma.user.findUnique({ where: { email } });
  }
}
