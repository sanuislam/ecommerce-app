"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
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
  TicketPercent,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/policies", label: "Legal pages", icon: FileText },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/seo", label: "SEO & PWA", icon: Search },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  return (
    <>
      <nav className="flex flex-col gap-0.5 px-2 py-2 text-sm">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 transition",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 pb-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to store
        </Link>
      </div>
    </>
  );
}

/** Desktop sidebar (md and up). */
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r bg-muted/30 md:flex">
      <div className="flex h-16 items-center px-4 text-lg font-semibold tracking-tight">
        Admin
      </div>
      <NavLinks />
    </aside>
  );
}

/** Sticky top bar with a slide-out menu (below md). */
export function AdminMobileBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const current = NAV.find((n) => isActive(pathname, n.href));

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label="Open admin menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="text-lg font-semibold">Admin</SheetTitle>
            <SheetDescription className="sr-only">
              Admin navigation
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <span className="truncate font-semibold">
        Admin{current ? ` · ${current.label}` : ""}
      </span>
    </header>
  );
}
