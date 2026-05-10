import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users,
  ArrowLeft,
  Settings,
  FileText,
  CreditCard,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/policies", label: "Legal pages", icon: FileText },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/seo", label: "SEO & PWA", icon: Search },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (session.user.role !== Role.ADMIN) redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-muted/30 md:block">
        <div className="flex h-16 items-center px-4 text-lg font-semibold tracking-tight">
          Admin
        </div>
        <nav className="flex flex-col gap-0.5 px-2 py-2 text-sm">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2 pb-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to store
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
