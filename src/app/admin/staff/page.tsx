import { redirect } from "next/navigation";
import { adminSession, twoFactorRequired } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, STAFF_ROLES, STAFF_ROLE_IDS } from "@/lib/permissions";
import { StaffManager } from "@/components/admin/staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await adminSession("owner");
  if (!session) redirect("/admin");
  const [people, require2fa, me] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        staffRole: true,
        passwordHash: true,
        twoFactorEnabledAt: true,
        createdAt: true,
      },
    }),
    twoFactorRequired(),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorEnabledAt: true } }),
  ]);
  const last = await prisma.auditLog.groupBy({
    by: ["userId"],
    where: { userId: { in: people.map((p) => p.id) } },
    _max: { createdAt: true },
  });
  const lastBy = new Map(last.map((l) => [l.userId, l._max.createdAt?.toISOString() ?? null]));

  return (
    <div className="max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Give your team their own sign-in with only the parts of the admin panel their job needs. Every change they
        make is in the audit log.
      </p>
      <StaffManager
        meId={session.user.id}
        meHas2fa={!!me?.twoFactorEnabledAt}
        require2fa={require2fa}
        people={people.map((p) => ({
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role as "ADMIN" | "STAFF",
          staffRole: p.staffRole,
          hasPassword: !!p.passwordHash,
          twoFactor: !!p.twoFactorEnabledAt,
          createdAt: p.createdAt.toISOString(),
          lastActive: lastBy.get(p.id) ?? null,
        }))}
        roles={STAFF_ROLE_IDS.map((id) => ({
          id,
          label: STAFF_ROLES[id].label,
          description: STAFF_ROLES[id].description,
          perms: STAFF_ROLES[id].perms.map((p) => PERMISSIONS[p]),
        }))}
      />
    </div>
  );
}
