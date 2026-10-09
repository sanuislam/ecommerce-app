"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { isAdminUser } from "@/lib/permissions";
import {
  ShoppingBag,
  User,
  LogOut,
  LayoutDashboard,
  Package,
  Menu,
  Search,
  Heart,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { useState, useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { SearchBar } from "@/components/site/search-bar";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/products", label: "Shop" },
  { href: "/products?sale=1", label: "Deals" },
  { href: "/products?featured=1", label: "Featured" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export type HeaderCategory = { name: string; slug: string };

const noop = () => () => {};

export function SiteHeader({ categories = [] }: { categories?: HeaderCategory[] }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  const isActive = (href: string) => href === "/products" && pathname === "/products";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-1 sm:gap-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <LogoMark className="size-6" /> Eid Bazar
                </SheetTitle>
              </SheetHeader>
              <div className="px-4">
                <SearchBar onSubmitted={close} />
              </div>
              <nav className="flex flex-col px-2 py-2" aria-label="Main">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              {categories.length > 0 && (
                <>
                  <Separator />
                  <div className="px-2 py-2">
                    <div className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Categories
                    </div>
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/category/${c.slug}`}
                        onClick={close}
                        className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
              <Separator />
              <div className="flex flex-col px-2 py-2">
                {session?.user ? (
                  <>
                    <div className="px-3 py-2 text-sm">
                      <div className="truncate font-medium">{session.user.name ?? "My account"}</div>
                      <div className="truncate text-xs text-muted-foreground">{session.user.email}</div>
                    </div>
                    <MenuLink href="/account" icon={User} onClick={close}>My account</MenuLink>
                    <MenuLink href="/orders" icon={Package} onClick={close}>My orders</MenuLink>
                    <MenuLink href="/wishlist" icon={Heart} onClick={close}>Wishlist</MenuLink>
                    {isAdminUser(session.user.role, session.user.staffRole) && (
                      <MenuLink href="/admin" icon={LayoutDashboard} onClick={close}>Admin</MenuLink>
                    )}
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-2">
                    <Button asChild variant="outline" onClick={close}>
                      <Link href="/sign-in">Sign in</Link>
                    </Button>
                    <Button asChild onClick={close}>
                      <Link href="/sign-up">Sign up</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" aria-label="Eid Bazar home" className="min-w-0 text-lg">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex lg:gap-5" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap transition-colors hover:text-foreground",
                  isActive(link.href) && "text-foreground",
                  // Keep the bar from wrapping on small tablets.
                  (link.href === "/about" || link.href === "/contact") && "hidden lg:inline",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <SearchBar className="hidden max-w-md flex-1 md:flex" />

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileSearchOpen ? "Close search" : "Search"}
            aria-expanded={mobileSearchOpen}
            className="md:hidden"
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            {mobileSearchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </Button>
          {session?.user && (
            <Button asChild variant="ghost" size="icon" aria-label="Wishlist" className="hidden sm:inline-flex">
              <Link href="/wishlist">
                <Heart className="size-5" />
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" aria-label={`Cart${mounted && count ? `, ${count} items` : ""}`}>
            <Link href="/cart" className="relative">
              <ShoppingBag className="size-5" />
              <AnimatePresence>
                {mounted && count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                  >
                    {count > 99 ? "99+" : count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </Button>

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="hidden md:inline-flex">
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="truncate font-medium">{session.user.name ?? session.user.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{session.user.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="gap-2">
                    <User className="size-4" /> My account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders" className="gap-2">
                    <Package className="size-4" /> My orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wishlist" className="gap-2">
                    <Heart className="size-4" /> Wishlist
                  </Link>
                </DropdownMenuItem>
                {isAdminUser(session.user.role, session.user.staffRole) && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="gap-2">
                      <LayoutDashboard className="size-4" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => signOut({ callbackUrl: "/" })}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
      {mobileSearchOpen && (
        <div className="border-t bg-background px-4 py-2 md:hidden">
          <SearchBar autoFocus onSubmitted={() => setMobileSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
    >
      <Icon className="size-4" /> {children}
    </Link>
  );
}
