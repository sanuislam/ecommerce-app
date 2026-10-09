"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Heart, LayoutGrid, MapPin, Package, ShieldCheck, Star, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const ACCOUNT_LINKS = [
  { href: "/account", label: "Overview", icon: LayoutGrid },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/reviews", label: "Reviews", icon: Star },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
] as const;

/** Sidebar on desktop, a scrolling row of tabs on phones. */
export function AccountNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/account" ? pathname === href : pathname.startsWith(href));
  const current = useRef<HTMLAnchorElement>(null);
  // On phones the menu scrolls sideways: bring the open page's tab into view.
  useEffect(() => {
    const el = current.current;
    const row = el?.closest("nav");
    if (el && row && row.scrollWidth > row.clientWidth) {
      row.scrollLeft = el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2;
    }
  }, [pathname]);
  return (
    <nav aria-label="My account" className="relative -mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1.5 lg:flex-col lg:gap-0.5">
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              ref={active(href) ? current : undefined}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition lg:rounded-md lg:border-0 lg:px-3 lg:py-2",
                active(href)
                  ? "border-primary bg-primary text-primary-foreground lg:bg-muted lg:font-medium lg:text-foreground"
                  : "hover:bg-muted",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
