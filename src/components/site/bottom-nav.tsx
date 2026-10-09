"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Home, LayoutGrid, ShoppingBag, Heart, User } from "lucide-react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/products", label: "Shop", icon: LayoutGrid, match: (p: string) => p === "/products" },
  { href: "/cart", label: "Cart", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") },
  { href: "/wishlist", label: "Saved", icon: Heart, match: (p: string) => p.startsWith("/wishlist") },
  {
    href: "/account",
    label: "Account",
    icon: User,
    match: (p: string) => p.startsWith("/account") || p.startsWith("/orders"),
  },
];

const noop = () => () => {};

/** App-style bottom tab bar for phones. Hidden where a page has its own bottom bar. */
export function BottomNav() {
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  // Product pages show a sticky buy bar; checkout has its own CTA.
  if (pathname.startsWith("/products/") || pathname.startsWith("/checkout")) return null;

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                <Icon className="size-5" />
                {label}
                {href === "/cart" && mounted && count > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Spacer so page content is not hidden behind the bottom bar on phones. */
export function BottomNavSpacer() {
  const pathname = usePathname();
  if (pathname.startsWith("/products/") || pathname.startsWith("/checkout")) return null;
  return <div aria-hidden className="h-[calc(3.5rem+env(safe-area-inset-bottom))] md:hidden" />;
}
