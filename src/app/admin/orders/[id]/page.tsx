import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, FileText, Package, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { allowedTransitions, STATUS_LABEL } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { BkashRefundButton } from "@/components/admin/bkash-refund-button";
import { MFS_LABELS, type MfsMethod } from "@/lib/mfs";
import type { OrderStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { OrderCourierCard } from "@/components/admin/order-courier-card";
import { OrderSmsCard } from "@/components/admin/order-sms-card";
import { OrderCodCard } from "@/components/admin/order-cod-card";
import { phoneRisk } from "@/lib/risk";
import { RETURN_REASONS, RETURN_STATUS_LABEL, returnEligibility, returnLabel, returnableItems } from "@/lib/returns";
import { ReturnRequestButton } from "@/components/return-request-form";
import { COURIER_LABEL, prettyStatus, trackingUrl, type CourierId } from "@/lib/couriers/common";
import { getSmsSettings, SMS_EVENT_LABEL, type SmsEvent } from "@/lib/sms";
import { SOURCE_LABEL } from "@/lib/admin-orders";

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
  const viewer = (await auth())?.user;
  const canRefund = can(viewer?.role, viewer?.staffRole, "refunds");
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
  const [smsLogs, sms, risk, returns, elig] = await Promise.all([
    prisma.smsLog.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } }),
    getSmsSettings(),
    phoneRisk(order.address?.phone ?? order.user.phone),
    prisma.returnRequest.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } }),
    order.status === "DELIVERED" ? returnEligibility(order.id, { admin: true }) : Promise.resolve(null),
  ]);
  const returnForm = elig?.ok ? await returnableItems(order.id, elig.items) : null;

  const bkashGateway =
    (order.paymentMethod === "BKASH" && !!order.bkashPaymentId) ||
    (order.paymentMethod === "UPAY" && !!order.upayTxnId);
  const allowed = allowedTransitions(order.status, order.paymentMethod)
    // Gateway bKash / Upay refunds must go through the refund button.
    .filter((s) => !(s === "REFUNDED" && bkashGateway))
    .map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const refundHidden =
    bkashGateway && allowedTransitions(order.status, order.paymentMethod).includes("REFUNDED");

  const discount = Number(order.discount);
  const costed = order.items.filter((i) => i.costPrice != null);
  const cogs = costed.length ? costed.reduce((n, i) => n + Number(i.costPrice) * i.quantity, 0) : null;
  const costMissing = costed.length > 0 && costed.length < order.items.length;
  const phone = order.address?.phone || order.user.phone;
  const customerName =
    order.address?.fullName ||
    order.user.name ||
    [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") ||
    null;

  const editable = ["PENDING", "PAID"].includes(order.status) && !order.courierConsignmentId;
  const canBook =
    !order.courierConsignmentId &&
    (order.status === "PAID" || (order.status === "PENDING" && order.paymentMethod === "COD"));
  const bookHint =
    order.status === "PENDING"
      ? "Book after the payment is confirmed."
      : ["SHIPPED", "DELIVERED"].includes(order.status)
        ? "Shipped without a booked courier."
        : null;
  const realEmail = !order.user.email.endsWith(".invalid");

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
            {fmtDateTime(order.createdAt)}
            {order.source !== "web" && <> · {SOURCE_LABEL[order.source] ?? order.source} order</>}
          </p>
        </div>
        <Badge variant={statusVariant(order.status)} className="text-sm">
          {STATUS_LABEL[order.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {editable && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/orders/${order.id}/edit`}>
              <Pencil className="size-4" /> Edit order
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <a href={`/print/orders?type=invoice&ids=${order.id}`} target="_blank" rel="noreferrer">
            <FileText className="size-4" /> Invoice
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={`/print/orders?type=slip&ids=${order.id}`} target="_blank" rel="noreferrer">
            <Package className="size-4" /> Packing slip
          </a>
        </Button>
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

          {(returns.length > 0 || returnForm) && (
            <section className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Returns and exchanges</h2>
                {returnForm && <ReturnRequestButton orderId={order.id} items={returnForm} reasons={RETURN_REASONS} admin />}
              </div>
              {returns.length > 0 && (
                <ul className="mt-3 divide-y">
                  {returns.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                      <Link href={`/admin/returns/${r.id}`} className="font-medium hover:underline">
                        {r.type === "EXCHANGE" ? "Exchange" : "Return"} {returnLabel(r)}
                      </Link>
                      <span className="text-muted-foreground">
                        {RETURN_STATUS_LABEL[r.status]}
                        {r.refundAmount ? ` · refunded ${formatPrice(Number(r.refundAmount))}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

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
          {order.paymentMethod === "COD" && (
            <OrderCodCard
              orderId={order.id}
              phone={phone ?? null}
              confirmedAt={order.codConfirmedAt ? fmtDateTime(order.codConfirmedAt) : null}
              attempts={order.codCallAttempts}
              note={order.codConfirmNote}
              pending={order.status === "PENDING"}
              risk={risk}
            />
          )}
          <OrderCourierCard
            orderId={order.id}
            courierLabel={order.courier ? (COURIER_LABEL[order.courier as CourierId] ?? order.courier) : null}
            consignment={order.courierConsignmentId}
            tracking={order.trackingNumber}
            trackingUrl={trackingUrl(order.courier, order.trackingNumber, phone)}
            status={prettyStatus(order.courierStatus)}
            updatedAt={order.courierUpdatedAt ? fmtDateTime(order.courierUpdatedAt) : null}
            charge={order.courierCharge != null ? formatPrice(Number(order.courierCharge)) : null}
            canBook={canBook}
            bookHint={bookHint}
            address={{
              district: order.address?.state ?? null,
              area: order.address?.city ?? null,
              postCode: order.address?.postalCode ?? null,
            }}
          />
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
                  ? `To refund, use “Refund via ${order.paymentMethod === "UPAY" ? "Upay" : "bKash"}” in the Payment card.`
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
            {cogs != null && (
              <>
                <div className="mt-2 flex justify-between gap-2 text-muted-foreground">
                  <span>Cost of goods{costMissing ? " (some items)" : ""}</span>
                  <span>−{formatPrice(cogs)}</span>
                </div>
                <div className="flex justify-between gap-2 font-medium">
                  <span>Gross profit</span>
                  <span>
                    {formatPrice(
                      Number(order.subtotal) - discount - Number(order.refundedAmount) - cogs - Number(order.courierCharge ?? 0),
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">After discount, refunds and courier charge. Admin only.</p>
              </>
            )}
            {Number(order.refundedAmount) > 0 && (
              <div className="flex justify-between gap-2 text-destructive">
                <span>Refunded</span>
                <span>−{formatPrice(Number(order.refundedAmount))}</span>
              </div>
            )}
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
              canRefund &&
              refundHidden &&
              order.bkashPaymentId &&
              order.paymentTransactionId && (
                <div className="mt-3 flex justify-end">
                  <BkashRefundButton
                    orderId={order.id}
                    amount={Number(order.total)}
                  />
                </div>
              )}
            {order.paymentMethod === "UPAY" &&
              canRefund &&
              refundHidden &&
              order.upayTxnId && (
                <div className="mt-3 flex justify-end">
                  <BkashRefundButton
                    orderId={order.id}
                    amount={Number(order.total)}
                    provider="upay"
                  />
                </div>
              )}
          </div>

          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Customer</h3>
            <div className="mt-2 space-y-0.5">
              {customerName && <div className="font-medium">{customerName}</div>}
              {realEmail && <div className="break-all text-muted-foreground">{order.user.email}</div>}
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
          <OrderSmsCard
            orderId={order.id}
            enabled={sms.enabled && !!sms.apiKey}
            logs={smsLogs.map((l) => ({
              id: l.id,
              label: l.event.startsWith("custom:") ? "Message" : (SMS_EVENT_LABEL[l.event as SmsEvent] ?? l.event),
              message: l.message,
              status: l.status,
              error: l.error,
              at: fmtDateTime(l.createdAt),
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
