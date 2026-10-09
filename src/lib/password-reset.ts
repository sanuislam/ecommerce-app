import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";

export const RESET_TTL_MIN = 60;
export const MIN_PASSWORD = 8;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Makes a one-time reset link. A newer link replaces older unused ones.
 * Only the SHA-256 of the token is stored.
 */
export async function createResetLink(userId: string, ttlMinutes = RESET_TTL_MIN): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordReset.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) },
    }),
  ]);
  return `${siteUrl()}/reset-password/${token}`;
}

/** The account a still-valid token belongs to (for the reset page), else null. */
export async function resetTarget(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, email: true, twoFactorEnabledAt: true } });
}

/**
 * Sets the new password if the token is valid and unused. The token is
 * claimed with a conditional update, so it works exactly once. Every
 * existing session of the account is signed out (passwordChangedAt).
 */
export async function redeemResetToken(token: string, password: string): Promise<{ userId: string } | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.$transaction(async (tx) => {
    const row = await tx.passwordReset.findUnique({ where: { tokenHash } });
    if (!row) return null;
    const claimed = await tx.passwordReset.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return null;
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    await tx.passwordReset.deleteMany({ where: { userId: row.userId, usedAt: null } });
    return { userId: row.userId };
  });
}
