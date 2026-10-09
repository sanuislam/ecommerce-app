import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import type { OrderStatus } from "@/generated/prisma";
import { can } from "@/lib/permissions";
import { ClearCartOnSuccess } from "@/components/site/clear-cart-on-success";
import { TrackPurchase } from "@/components/site/track-purchase";
import { OrderStatusBadge } from "@/components/site/order-status-badge";
import { CancelOrderButton } from "@/components/site/cancel-order-button";
import { MFS_LABELS, type MfsMethod } from "@/lib/mfs";
import { STATUS_LABEL } from "@/lib/orders";
import { settleUpayOrder } from "@/lib/upay-settle";
import { COURIER_LABEL, trackingUrl, type CourierId } from "@/lib/couriers/common";
import {
  RETURN_REASONS,
  RETURN_STATUS_LABEL,
  returnEligibility,
  returnLabel,
  returnableItems,
} from "@/lib/returns";
import { CancelReturnButton, ReturnRequestButton } from "@/components/return-request-form";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order details",
  description: "View your Eid Bazar order details and status.",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; bkash?: string; upay?: string; payment?: string }>;
};

const dhakaDateTime = (d: Date) =>
  d.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Placed" },
  { status: "PAID", label: "Confirmed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=/orders/${id}`);

  const load = () =>
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { slug: true } } } },
        address: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    });
  let order = await load();
  if (!order) notFound();

  const isOwner = order.userId === session.user.id;
  const isAdmin = can(session.user.role, session.user.staffRole, "orders");
  if (!isOwner && !isAdmin) notFound();

  // An Upay payment still open: ask Upay again, so a refresh shows the result.
  if (order.status === "PENDING" && order.paymentMethod === "UPAY" && order.upayTxnId) {
    const outcome = await settleUpayOrder(order.id);
    if (outcome === "paid" || outcome === "cancelled") order = (await load()) ?? order;
  }

  const site = await getSiteSettings();
  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const reached = new Set(order.events.map((e) => e.status));
  // COD orders skip "Confirmed" until delivery; treat later steps as reaching it.
  const stepIndex = Math.max(
    0,
    ...STEPS.map((s, i) => (reached.has(s.status) || order.status === s.status ? i : 0)),
  );
  const canCancel =
    isOwner &&
    order.status === "PENDING" &&
    !order.paymentTransactionId &&
    !order.bkashPaymentId &&
    !order.upayTxnId &&
    !order.stripeId;

  const trackUrl = trackingUrl(order.courier, order.trackingNumber, order.address?.phone);

  // Returns / exchanges: the customer's requests, and whether they can ask now.
  const [returns, elig] = await Promise.all([
    prisma.returnRequest.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { orderItem: { select: { name: true } } } } },
    }),
    isOwner && order.status === "DELIVERED" ? returnEligibility(order.id) : Promise.resolve(null),
  ]);
  const returnForm = elig?.ok ? await returnableItems(order.id, elig.items) : null;

  const notice =
    sp.bkash === "cancel"
      ? { tone: "warn", text: "bKash payment was cancelled, so this order was not placed." }
      : sp.bkash === "failed"
        ? { tone: "warn", text: "bKash payment did not go through. No money was taken for this order." }
        : sp.bkash === "review"
          ? { tone: "warn", text: "We received your bKash payment and are checking it. We will confirm shortly." }
          : sp.upay === "failed" || sp.upay === "cancelled"
            ? { tone: "warn", text: "Upay payment did not go through, so this order was cancelled. No money was taken." }
            : sp.upay === "review"
              ? { tone: "warn", text: "We received your Upay payment and are checking it. We will confirm shortly." }
              : sp.upay === "pending" && order.status === "PENDING"
                ? { tone: "warn", text: "Your Upay payment is still being processed. Refresh this page in a minute to see the result." }
                : sp.payment === "cancelled"
            ? { tone: "warn", text: "Card payment was not completed. The order will be cancelled automatically." }
            : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {((sp.success && order.status !== "CANCELLED") ||
        (sp.upay && order.status !== "CANCELLED" && order.status !== "PENDING")) && (
        <ClearCartOnSuccess />
      )}
      {isOwner &&
        (sp.success || sp.upay) &&
        (["PAID", "SHIPPED", "DELIVERED"].includes(order.status) ||
          (order.status === "PENDING" && order.paymentMethod === "COD")) && (
          <TrackPurchase
            orderId={order.id}
            value={Number(order.total)}
            shipping={Number(order.shipping)}
            items={order.items.map((i) => ({
              id: i.productId,
              name: i.name,
              price: Number(i.price),
              quantity: i.quantity,
              variant: i.variantName,
            }))}
          />
        )}
      {sp.success && order.status !== "CANCELLED" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <div className="font-semibold">Thanks for your order!</div>
            <div className="text-sm text-muted-foreground">
              We&apos;ll call you on {order.address?.phone ?? "your phone"} if we need to confirm
              anything. You can follow the status on this page.
            </div>
          </div>
        </div>
      )}
      {notice && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>{notice.text}</div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">Placed {dhakaDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* ---- Progress tracker ---- */}
      <section className="mt-6 rounded-lg border bg-card p-4 sm:p-5" aria-label="Order progress">
        {cancelled ? (
          <div className="flex items-center gap-3 text-sm">
            <XCircle className="size-5 text-destructive" />
            <span>
              This order was {order.status === "REFUNDED" ? "refunded" : "cancelled"}.
            </span>
          </div>
        ) : (
          <ol className="grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => {
              const done = i <= stepIndex;
              return (
                <li key={s.status} className="flex flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : done ? "bg-primary" : "bg-border"}`} />
                    {done ? (
                      <CheckCircle2 className="size-6 shrink-0 text-primary" />
                    ) : (
                      <Circle className="size-6 shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "invisible" : i < stepIndex ? "bg-primary" : "bg-border"}`}
                    />
                  </div>
                  <span className={`mt-1.5 text-xs sm:text-sm ${done ? "font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {(order.courier || order.trackingNumber) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-3 text-sm">
            <Truck className="size-4 shrink-0" />
            <span>
              {COURIER_LABEL[order.courier as CourierId] ?? order.courier ?? "Courier"}
              {order.trackingNumber && (
                <>
                  {" "}· Tracking no. <span className="font-mono font-medium">{order.trackingNumber}</span>
                </>
              )}
            </span>
            {trackUrl && (
              <a href={trackUrl} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
                Track parcel
              </a>
            )}
          </div>
        )}
        {order.events.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium">Order history</summary>
            <ul className="mt-3 space-y-3 border-l pl-4">
              {[...order.events].reverse().map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-primary" />
                  <div className="font-medium">{STATUS_LABEL[e.status]}</div>
                  {e.note && e.note !== "Order placed" && e.note !== "Imported" && (
                    <div className="text-muted-foreground">{e.note}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{dhakaDateTime(e.createdAt)}</div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="mt-3 divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 py-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.product.slug}`} className="line-clamp-2 font-medium hover:underline">
                    {item.name}
                  </Link>
                  {item.variantName && (
                    <div className="text-xs text-muted-foreground">{item.variantName}</div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Qty {item.quantity} · {formatPrice(Number(item.price))} each
                  </div>
                  {order.status === "DELIVERED" && isOwner && (
                    <Link
                      href={`/products/${item.product.slug}#reviews`}
                      className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      <PackageCheck className="mr-1 inline size-3.5" />
                      Write a review
                    </Link>
                  )}
                </div>
                <div className="shrink-0 font-semibold">
                  {formatPrice(Number(item.price) * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Summary</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span>−{formatPrice(Number(order.discount))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{Number(order.shipping) === 0 ? "Free" : formatPrice(Number(order.shipping))}</span>
              </div>
              {Number(order.tax) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(Number(order.tax))}</span>
                </div>
              )}
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Payment</h3>
            <div className="mt-2 flex justify-between gap-2">
              <span className="text-muted-foreground">Method</span>
              <span className="text-right font-medium">
                {order.paymentMethod === "STRIPE"
                  ? "Card"
                  : order.paymentMethod === "COD"
                    ? "Cash on delivery"
                    : MFS_LABELS[order.paymentMethod as MfsMethod]}
              </span>
            </div>
            {order.paymentTransactionId && (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">TrxID</span>
                <span className="font-mono break-all">{order.paymentTransactionId}</span>
              </div>
            )}
            {order.status === "PENDING" && order.paymentTransactionId && (
              <p className="mt-2 text-xs text-muted-foreground">
                We&apos;re verifying your payment. This usually takes under 30 minutes.
              </p>
            )}
            {order.status === "PENDING" && order.paymentMethod === "COD" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Please keep {formatPrice(Number(order.total))} ready for the delivery person.
              </p>
            )}
          </div>
          {order.address && (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <h3 className="font-semibold">Delivery address</h3>
              <div className="mt-2 space-y-0.5 break-words text-muted-foreground">
                <div className="text-foreground">{order.address.fullName}</div>
                {order.address.phone && <div>{order.address.phone}</div>}
                <div>{order.address.line1}</div>
                {order.address.line2 && <div>{order.address.line2}</div>}
                <div>
                  {[order.address.city, order.address.state, order.address.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>
          )}
          {canCancel && <CancelOrderButton orderId={order.id} />}
          {(returns.length > 0 || returnForm) && (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <h3 className="font-semibold">Returns and exchanges</h3>
              {returns.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {returns.map((r) => (
                    <li key={r.id} className="rounded-md bg-muted/50 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {r.type === "EXCHANGE" ? "Exchange" : "Return"} {returnLabel(r)}
                        </span>
                        <span className="text-xs">{RETURN_STATUS_LABEL[r.status]}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {r.items.map((i) => `${i.orderItem.name} ×${i.quantity}`).join(", ")}
                      </div>
                      {r.refundedAt && r.refundAmount && (
                        <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                          Refunded {formatPrice(Number(r.refundAmount))} via {r.refundMethod}
                        </div>
                      )}
                      {r.status === "REJECTED" && r.adminNote && (
                        <div className="mt-1 text-xs text-muted-foreground">{r.adminNote}</div>
                      )}
                      {isOwner && r.status === "REQUESTED" && (
                        <div className="mt-1 flex justify-end">
                          <CancelReturnButton orderId={order.id} returnId={r.id} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {returnForm && elig?.ok && (
                <div className="mt-3">
                  <ReturnRequestButton
                    orderId={order.id}
                    items={returnForm}
                    reasons={RETURN_REASONS}
                    until={elig.until ? dhakaDateTime(elig.until) : null}
                  />
                </div>
              )}
            </div>
          )}
          {(site.whatsappUrl || site.supportPhone) && (
            <Button asChild variant="ghost" className="w-full">
              <a
                href={site.whatsappUrl || `tel:${site.supportPhone.replace(/\s/g, "")}`}
                target={site.whatsappUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                Need help with this order?
              </a>
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
