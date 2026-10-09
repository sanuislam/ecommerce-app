import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, LayoutDashboard, Package } from "lucide-react";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { AddressBook, PasswordForm, ProfileForm } from "@/components/account/account-forms";
import { OrderStatusBadge } from "@/components/site/order-status-badge";
import { SignOutButton } from "@/components/account/sign-out-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/account");

  const [user, addresses, recent, wishlistCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, firstName: true, lastName: true, phone: true, email: true, role: true, staffRole: true },
    }),
    prisma.address.findMany({
      where: { userId: session.user.id, archived: false },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.wishlistItem.count({ where: { userId: session.user.id } }),
  ]);
  if (!user) redirect("/sign-in");

  const [fallbackFirst, ...rest] = (user.name ?? "").split(" ");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My account</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/orders" className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:shadow-sm">
          <Package className="size-5 text-primary" />
          <span className="text-sm font-medium">My orders</span>
        </Link>
        <Link href="/wishlist" className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:shadow-sm">
          <Heart className="size-5 text-rose-500" />
          <span className="text-sm font-medium">Wishlist ({wishlistCount})</span>
        </Link>
        {isAdminUser(user.role, user.staffRole) && (
          <Link href="/admin" className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:shadow-sm">
            <LayoutDashboard className="size-5" />
            <span className="text-sm font-medium">Admin</span>
          </Link>
        )}
      </div>

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <div className="mt-3 space-y-2">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm hover:shadow-sm"
              >
                <span>
                  <span className="font-medium">#{o.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground"> · {formatDate(o.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} />
                  <span className="font-medium">{formatPrice(Number(o.total))}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        <ProfileForm
          email={user.email}
          initial={{
            firstName: user.firstName ?? fallbackFirst ?? "",
            lastName: user.lastName ?? rest.join(" "),
            phone: user.phone?.startsWith("01") ? user.phone : "",
          }}
        />
      </section>

      <section className="mt-6 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold">Saved addresses</h2>
        <AddressBook
          addresses={addresses.map((a) => ({
            id: a.id,
            fullName: a.fullName,
            phone: a.phone ?? "",
            line1: a.line1,
            line2: a.line2 ?? "",
            city: a.city,
            state: a.state ?? "",
            isDefault: a.isDefault,
          }))}
        />
      </section>

      <section className="mt-6 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold">Password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
