import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { adminUser, twoFactorRequired } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, isStaffRole } from "@/lib/permissions";
import { SecurityPanel } from "@/components/admin/security-panel";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ required?: string }> };

export default async function SecurityPage({ searchParams }: Props) {
  const session = await adminUser();
  if (!session) redirect("/");
  const [me, required, { required: fromGate }] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, role: true, staffRole: true, twoFactorEnabledAt: true, twoFactorRecovery: true },
    }),
    twoFactorRequired(),
    searchParams,
  ]);
  if (!me) redirect("/");
  const roleLabel =
    me.role === "ADMIN" ? "Owner" : isStaffRole(me.staffRole) ? STAFF_ROLES[me.staffRole].label : "Staff";

  return (
    <div className="max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">My security</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {me.email} · {roleLabel}
      </p>
      {required && !me.twoFactorEnabledAt ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Two-factor sign-in is required</p>
            <p className="mt-0.5">
              {fromGate ? "The rest of the admin panel opens " : "The admin panel opens "}
              once you turn it on below. It takes a minute with Google Authenticator, Microsoft Authenticator or
              any TOTP app.
            </p>
          </div>
        </div>
      ) : null}
      <SecurityPanel
        enabledAt={me.twoFactorEnabledAt?.toISOString() ?? null}
        recoveryLeft={me.twoFactorRecovery.length}
      />
    </div>
  );
}
