import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { abandonedWhere, cleanLines, getCartReminderSettings, MAX_REMINDERS, resolveLines, CART_TEMPLATE_VARS } from "@/lib/carts";
import { getSmsSettings, bdMobile } from "@/lib/sms";
import { ListPager } from "@/components/admin/list-pager";
import { CartsTable, CartReminderForm } from "@/components/admin/carts-manager";
import { orderNo } from "@/lib/order-number";

export const dynamic = "force-dynamic";
const PAGE = 50;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AbandonedCartsPage({ searchParams }: Props) {
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const [settings, sms] = await Promise.all([getCartReminderSettings(), getSmsSettings()]);
  const where = abandonedWhere(settings.afterHours);
  const since = daysAgo(30);

  const [snaps, total, openValue, remindersSent, recovered] = await Promise.all([
    prisma.cartSnapshot.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.cartSnapshot.count({ where }),
    prisma.cartSnapshot.aggregate({ where, _sum: { value: true } }),
    prisma.smsLog.count({ where: { event: { startsWith: "cart:" }, status: "sent", createdAt: { gte: since } } }),
    prisma.cartSnapshot.findMany({
      where: { recoveredAt: { gte: since } },
      orderBy: { recoveredAt: "desc" },
      select: { recoveredOrderId: true, recoveredAt: true, reminderCoupon: true },
    }),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: snaps.map((s) => s.userId) } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      smsOptOut: true,
      addresses: { orderBy: { createdAt: "desc" }, take: 1, select: { phone: true } },
    },
  });
  const userBy = new Map(users.map((u) => [u.id, u]));
  const lines = await Promise.all(snaps.map((s) => resolveLines(cleanLines(s.items))));
  const recoveredOrders = await prisma.order.findMany({
    where: { id: { in: recovered.map((r) => r.recoveredOrderId!).filter(Boolean) } },
    select: { id: true, number: true, total: true, status: true, user: { select: { name: true, email: true } } },
  });
  const recoveredValue = recoveredOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + Number(o.total), 0);
  const smsReady = sms.enabled && !!sms.apiKey;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Abandoned carts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed-in shoppers who put things in the cart and didn&apos;t order for {settings.afterHours} hour
        {settings.afterHours === 1 ? "" : "s"}. A reminder SMS links straight back to their cart and checkout.
      </p>
      {!smsReady ? (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Reminders need SMS: set it up in <Link href="/admin/sms" className="underline">Admin → SMS</Link>.
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          ["Waiting carts", String(total)],
          ["Value waiting", formatPrice(Number(openValue._sum.value ?? 0))],
          ["Reminders · 30 days", String(remindersSent)],
          [
            "Recovered · 30 days",
            `${recoveredOrders.filter((o) => o.status !== "CANCELLED").length} · ${formatPrice(recoveredValue)}`,
          ],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg border bg-card p-3 sm:p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <CartsTable
          smsReady={smsReady}
          defaultCoupon={settings.couponCode}
          maxReminders={MAX_REMINDERS}
          carts={snaps.map((s, i) => {
            const u = userBy.get(s.userId);
            return {
              id: s.id,
              customer: u?.name || u?.email || "Customer",
              email: u?.email.endsWith(".invalid") ? "" : (u?.email ?? ""),
              phone: bdMobile(u?.phone) ?? bdMobile(u?.addresses[0]?.phone) ?? null,
              optOut: !!u?.smsOptOut,
              items: lines[i].map((l) => `${l.name}${l.variantName ? ` (${l.variantName})` : ""} × ${l.quantity}`),
              value: Number(s.value),
              updatedAt: s.updatedAt.toISOString(),
              remindedAt: s.remindedAt?.toISOString() ?? null,
              reminderCount: s.reminderCount,
            };
          })}
        />
        <ListPager action="/admin/carts" q="" page={page} pageSize={PAGE} total={total} noun="carts" />
      </div>

      {recoveredOrders.length ? (
        <section className="mt-6 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Recovered after a reminder · last 30 days</h2>
          <ul className="mt-2 divide-y text-sm">
            {recoveredOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                  {orderNo(o)} · {o.user.name || o.user.email}
                </Link>
                <span className="tabular-nums">
                  {formatPrice(Number(o.total))}
                  {o.status === "CANCELLED" ? <span className="ml-1 text-xs text-muted-foreground">(cancelled)</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6">
        <CartReminderForm initial={settings} vars={CART_TEMPLATE_VARS} />
      </div>
    </div>
  );
}
