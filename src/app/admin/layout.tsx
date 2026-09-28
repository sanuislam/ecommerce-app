import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";
import { AdminMobileBar, AdminSidebar } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (session.user.role !== Role.ADMIN) redirect("/");

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
