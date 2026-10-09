import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, isAdminUser, type Permission } from "@/lib/permissions";

/**
 * The signed-in session when it may do `perm`, else null. Without a
 * permission only the owner (role ADMIN) passes. When the owner requires
 * two-factor sign-in, accounts without it are refused too.
 */
export async function adminSession(perm: Permission = "owner") {
  const session = await auth();
  if (!session?.user) return null;
  if (!can(session.user.role, session.user.staffRole, perm)) return null;
  const [rules, me] = await Promise.all([
    prisma.adminSettings.findUnique({ where: { id: "default" }, select: { require2fa: true } }).catch(() => null),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorEnabledAt: true } }),
  ]);
  if (rules?.require2fa && !me?.twoFactorEnabledAt) return null;
  return session;
}

/**
 * Any admin-panel user (owner or staff), WITHOUT the two-factor rule: for
 * "My security", where people turn two-factor on.
 */
export async function adminUser() {
  const session = await auth();
  if (!session?.user || !isAdminUser(session.user.role, session.user.staffRole)) return null;
  return session;
}

/** Is two-factor sign-in required for the admin panel? */
export async function twoFactorRequired(): Promise<boolean> {
  const row = await prisma.adminSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  return !!row?.require2fa;
}
