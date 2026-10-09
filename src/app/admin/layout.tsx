import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/permissions";
import { AdminMobileBar, AdminSidebar } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

const ADMIN_TOKENS = `:root{--primary:#1f1a1c;--primary-foreground:#fafafa;--ring:#a3a3a3;--background:#ffffff;--secondary:#f5f5f5;--secondary-foreground:#1f1a1c;--muted:#f5f5f5;--muted-foreground:#6b6b6b;--accent:#f5f5f5;--accent-foreground:#1f1a1c;--border:#e8e8e8;--input:#e5e5e5;--sidebar:#fafafa;--sidebar-primary:#1f1a1c;--sidebar-accent:#f2f2f2;--sidebar-border:#e8e8e8;--sidebar-ring:#a3a3a3}`;

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
      {/* The admin panel stays neutral (ink buttons), so "Save" never looks like "Delete". */}
      <style>{ADMIN_TOKENS}</style>
      <AdminSidebar access={access} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar access={access} />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
