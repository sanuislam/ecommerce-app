import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashRecovery, openSecret, verifyTotp } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";

/** Checks the account password (rate-limited per user). */
export async function checkPassword(userId: string, password: string): Promise<boolean> {
  if (!(await rateLimit(`pwcheck:${userId}`, 10, 900))) return false;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return !!u?.passwordHash && (await bcrypt.compare(password, u.passwordHash));
}

/** Checks a code from the app, or uses up a recovery code. */
export async function checkSecondFactor(userId: string, code: string): Promise<boolean> {
  if (!(await rateLimit(`2fa:${userId}`, 6, 900))) return false;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true } });
  const secret = u?.twoFactorSecret ? openSecret(u.twoFactorSecret) : null;
  const c = code.replace(/\s/g, "");
  if (secret && verifyTotp(secret, c)) return true;
  if (c.length < 10) return false;
  const used = await prisma.$executeRaw`
    UPDATE "User" SET "twoFactorRecovery" = array_remove("twoFactorRecovery", ${hashRecovery(c)})
    WHERE "id" = ${userId} AND ${hashRecovery(c)} = ANY("twoFactorRecovery")`;
  return used === 1;
}
