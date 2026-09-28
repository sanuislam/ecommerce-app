import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { allowedTransitions, STATUS_LABEL } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { BkashRefundButton } from "@/components/admin/bkash-refund-button";
import { MFS_LABELS, type MfsMethod } from "@/lib/mfs";
import type { OrderStatus } from "@/generated/prisma";

type Props = { params: Promise<{ id: string }> };

const ZONE_LABEL: Record<string, string> = {
  DHAKA: "Inside Dhaka",
  OUTSIDE_DHAKA: "Outside Dhaka",
};

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

function statusVariant(s: OrderStatus) {
  if (s === "PAID" || s === "DELIVERED") return "default" as const;
  if (s === "CANCELLED" || s === "REFUNDED") return "destructive" as const;
  return "secondary" as const;
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: true,
      address: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const bkashGateway = order.paymentMethod === "BKASH" && !!order.bkashPaymentId;
  const allowed = allowedTransitions(order.status, order.paymentMethod)
    // Gateway bKash refunds must go through the refund button (API enforces it).
    .filter((s) => !(s === "REFUNDED" && bkashGateway))
    .map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const refundHidden =
    bkashGateway && allowedTransitions(order.status, order.paymentMethod).includes("REFUNDED");

  const discount = Number(order.discount);
  const phone = order.address?.phone || order.user.phone;
  const customerName =
    order.address?.fullName ||
    order.user.name ||
    [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") ||
    null;

  const timeline =
    order.events.length > 0
      ? order.events
      : [{ id: "created", status: "PENDING" as OrderStatus, note: null, createdAt: order.createdAt }];

  return (
    <div className="p-4 sm:p-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All orders
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm break-all text-muted-foreground">
            {order.user.email} · {fmtDateTime(order.createdAt)}
          </p>
        </div>
        <Badge variant={statusVariant(order.status)} className="text-sm">
          {STATUS_LABEL[order.status]}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold">Items</h2>
            <div className="mt-3 divide-y">
              {order.items.map((i) => (
                <div key={i.id} className="flex gap-3 py-3">
                  {i.image && (
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image src={i.image} alt={i.name} fill sizes="64px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium break-words">{i.name}</div>
                    {i.variantName && (
                      <div className="text-sm text-muted-foreground">{i.variantName}</div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Qty {i.quantity} · {formatPrice(Number(i.price))} each
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold">
                    {formatPrice(Number(i.price) * i.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <ol className="mt-3 space-y-4 border-l pl-4">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{STATUS_LABEL[e.status]}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDateTime(e.createdAt)}
                    </span>
                  </div>
                  {e.note && (
                    <p className="mt-0.5 text-sm break-words text-muted-foreground">{e.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {order.notes && (
            <section className="rounded-lg border bg-card p-4 text-sm">
              <h2 className="text-lg font-semibold">Customer note</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
                {order.notes}
              </p>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="mb-3 font-semibold">Update order</h3>
            <OrderStatusSelect
              orderId={order.id}
              currentLabel={STATUS_LABEL[order.status]}
              allowed={allowed}
              courier={order.courier}
              trackingNumber={order.trackingNumber}
              refundHint={
                refundHidden
                  ? "To refund, use “Refund via bKash” in the Payment card."
                  : undefined
              }
            />
          </div>

          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Summary</h3>
            <div className="mt-2 flex justify-between gap-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  Discount
                  {order.couponCode && (
                    <span className="ml-1 font-mono text-xs">({order.couponCode})</span>
                  )}
                </span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                Shipping
                {order.shippingZone && (
                  <span className="ml-1 text-xs">
                    ({ZONE_LABEL[order.shippingZone] ?? order.shippingZone})
                  </span>
                )}
              </span>
              <span>{formatPrice(Number(order.shipping))}</span>
            </div>
            {Number(order.tax) > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(Number(order.tax))}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between gap-2 font-semibold">
              <span>Total</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
            {order.couponCode && discount === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Coupon <span className="font-mono">{order.couponCode}</span> applied
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Payment</h3>
            <div className="mt-2 flex justify-between gap-2">
              <span className="text-muted-foreground">Method</span>
              <span className="text-right font-medium">
                {order.paymentMethod === "STRIPE"
                  ? "Card (Stripe)"
                  : order.paymentMethod === "COD"
                    ? "Cash on Delivery"
                    : MFS_LABELS[order.paymentMethod as MfsMethod]}
              </span>
            </div>
            {order.paymentSenderNumber && (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Sender</span>
                <span className="font-mono">{order.paymentSenderNumber}</span>
              </div>
            )}
            {order.paymentTransactionId && (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">TrxID</span>
                <span className="break-all font-mono">{order.paymentTransactionId}</span>
              </div>
            )}
            {order.stripeId && (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Stripe</span>
                <span className="break-all font-mono text-xs">{order.stripeId}</span>
              </div>
            )}
            {order.paymentMethod === "BKASH" &&
              order.status === "PAID" &&
              order.bkashPaymentId &&
              order.paymentTransactionId && (
                <div className="mt-3 flex justify-end">
                  <BkashRefundButton
                    orderId={order.id}
                    amount={Number(order.total)}
                  />
                </div>
              )}
          </div>

          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Customer</h3>
            <div className="mt-2 space-y-0.5">
              {customerName && <div className="font-medium">{customerName}</div>}
              <div className="break-all text-muted-foreground">{order.user.email}</div>
              {phone && (
                <a href={`tel:${phone}`} className="block text-primary hover:underline">
                  {phone}
                </a>
              )}
            </div>
            {order.address && (
              <>
                <Separator className="my-3" />
                <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Shipping address
                </h4>
                <div className="mt-1 space-y-0.5 break-words">
                  <div>{order.address.line1}</div>
                  {order.address.line2 && <div>{order.address.line2}</div>}
                  <div>
                    <span className="text-muted-foreground">Area: </span>
                    {order.address.city}
                  </div>
                  {order.address.state && (
                    <div>
                      <span className="text-muted-foreground">District: </span>
                      {order.address.state}
                    </div>
                  )}
                  {order.address.postalCode && (
                    <div>
                      <span className="text-muted-foreground">Postcode: </span>
                      {order.address.postalCode}
                    </div>
                  )}
                  {order.address.country && order.address.country !== "BD" && (
                    <div>{order.address.country}</div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
