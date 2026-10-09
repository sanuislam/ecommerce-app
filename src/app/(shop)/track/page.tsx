import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { orderNo, parseOrderNo } from "@/lib/order-number";
import { formatPrice } from "@/lib/utils";
import { OrderProgress } from "@/components/site/order-progress";
import { OrderStatusBadge } from "@/components/site/order-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Track your order",
  description: "Check where your Eid Bazar order is with its order number and phone number.",
  alternates: { canonical: "/track" },
};

type Props = { searchParams: Promise<{ order?: string; phone?: string }> };

const tail = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").slice(-10);

/** Order status for anyone with the order number and the phone it was placed with — no sign-in. */
export default async function TrackPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ref = (sp.order ?? "").slice(0, 30);
  const phone = (sp.phone ?? "").slice(0, 20);
  let error: string | null = null;
  let order: Awaited<ReturnType<typeof find>> = null;

  async function find(no: number) {
    return prisma.order.findUnique({
      where: { number: no },
      select: {
        id: true,
        number: true,
        userId: true,
        status: true,
        paymentMethod: true,
        codConfirmedAt: true,
        courier: true,
        trackingNumber: true,
        total: true,
        createdAt: true,
        address: { select: { phone: true, state: true } },
        user: { select: { phone: true } },
        events: { select: { status: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { items: true } },
      },
    });
  }

  if (ref || phone) {
    const no = parseOrderNo(ref);
    if (no == null || no > 2_147_483_647) error = "Enter the order number from your SMS or e-mail, e.g. EB-10001.";
    else if (tail(phone).length !== 10) error = "Enter the mobile number you ordered with.";
    else if (!(await rateLimit(`track:${await clientIp().catch(() => "x")}`, 20, 3600))) error = "Too many tries. Try again later.";
    else {
      const o = await find(no);
      // Same answer for a wrong number and a wrong phone: no guessing which.
      if (o && [o.address?.phone, o.user.phone].some((p) => tail(p) === tail(phone))) order = o;
      else error = "We couldn't find an order with that number and phone. Check both and try again.";
    }
  }
  const session = order ? await auth() : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        <PackageSearch className="size-7" /> Track your order
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">No account needed: the order number and the phone you ordered with.</p>

      <form method="get" action="/track" className="mt-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="order">Order number</Label>
          <Input id="order" name="order" defaultValue={ref} placeholder="EB-10001" required autoComplete="off" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" name="phone" defaultValue={phone} placeholder="01XXXXXXXXX" inputMode="tel" required autoComplete="tel" />
        </div>
        <Button type="submit">Track</Button>
      </form>

      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

      {order ? (
        <section className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-lg font-semibold">Order {orderNo(order)}</div>
              <div className="text-sm text-muted-foreground">
                {order.createdAt.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" })} ·{" "}
                {order._count.items} item{order._count.items === 1 ? "" : "s"} · {formatPrice(Number(order.total))}
                {order.address?.state ? ` · to ${order.address.state}` : ""}
              </div>
            </div>
            <OrderStatusBadge order={order} />
          </div>
          <div className="mt-5">
            <OrderProgress order={{ ...order, phone: order.address?.phone }} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {session?.user?.id === order.userId ? (
              <Link href={`/orders/${order.id}`} className="font-medium text-foreground underline">
                See the full order
              </Link>
            ) : (
              <>
                <Link href={`/sign-in?callbackUrl=/orders/${order.id}`} className="font-medium text-foreground underline">
                  Sign in
                </Link>{" "}
                for the full order, returns and reviews.
              </>
            )}
          </p>
        </section>
      ) : null}
    </div>
  );
}
