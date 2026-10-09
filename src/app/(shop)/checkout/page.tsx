import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { auth } from "@/auth";
import { shownEmail } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { bkashConfigured } from "@/lib/bkash";
import { upayConfigured } from "@/lib/upay";
import { getOrderSettings } from "@/lib/order-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Eid Bazar order securely.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ coupon?: string }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/checkout");
  const { coupon } = await searchParams;
  const initialCoupon =
    typeof coupon === "string" && /^[A-Za-z0-9_-]{2,40}$/.test(coupon) ? coupon.toUpperCase() : "";

  const [user, addresses, bkashLive, upayLive, rules] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true },
    }),
    prisma.address.findMany({
      where: { userId: session.user.id, archived: false },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    bkashConfigured(),
    upayConfigured(),
    getOrderSettings(),
  ]);


  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Two steps: where to deliver, then how to pay.
      </p>
      <CheckoutForm
        userEmail={shownEmail(session.user.email)}
        defaultName={user?.name ?? ""}
        defaultPhone={user?.phone?.startsWith("01") ? user.phone : ""}
        savedAddresses={addresses.map((a) => ({
          id: a.id,
          fullName: a.fullName,
          phone: a.phone ?? "",
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city,
          state: a.state ?? "",
          isDefault: a.isDefault,
        }))}
        wallets={{ BKASH: bkashLive, NAGAD: false, ROCKET: false, UPAY: upayLive }}
        codMax={rules.codMaxAmount}
        initialCoupon={initialCoupon}
      />
    </div>
  );
}
