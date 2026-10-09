import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/permissions";
import { AdminMobileBar, AdminSidebar } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (!isAdminUser(session.user.role, session.user.staffRole)) redirect("/");

  // The owner can require two-factor sign-in for everyone in the admin panel.
  const [rules, me] = await Promise.all([
    prisma.adminSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorEnabledAt: true } }),
  ]);
  const path = (await headers()).get("x-admin-path") ?? "";
  if (rules?.require2fa && !me?.twoFactorEnabledAt && !path.startsWith("/admin/security")) {
    redirect("/admin/security?required=1");
  }

  const access = { role: session.user.role, staffRole: session.user.staffRole };
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar access={access} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar access={access} />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
