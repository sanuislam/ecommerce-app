import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { REFUND_METHODS, RETURN_STATUS_LABEL, returnLabel } from "@/lib/returns";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { ReturnActions } from "@/components/admin/return-actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const fmt = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function ReturnDetailPage({ params }: Props) {
  const viewer = (await auth())?.user;
  const canRefund = can(viewer?.role, viewer?.staffRole, "refunds");
  const { id } = await params;
  const r = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: { include: { address: true, user: { select: { name: true, phone: true } } } },
      items: { include: { orderItem: true } },
    },
  });
  if (!r) notFound();
  const o = r.order;
  const itemsValue = r.items.reduce((n, i) => n + Number(i.orderItem.price) * i.quantity, 0);
  const refundLeft = Math.max(0, Number(o.total) - Number(o.refundedAmount));
  const gateway =
    o.paymentMethod === "BKASH" && o.bkashPaymentId && o.paymentTransactionId
      ? "bKash"
      : o.paymentMethod === "UPAY" && o.upayTxnId
        ? "Upay"
        : null;

  return (
    <div className="p-4 sm:p-6">
      <Link href="/admin/returns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Returns
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {r.type === "EXCHANGE" ? "Exchange" : "Return"} {returnLabel(r)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {fmt(r.createdAt)} · order{" "}
            <Link href={`/admin/orders/${o.id}`} className="underline">
              #{o.id.slice(0, 8)}
            </Link>
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm font-medium">{RETURN_STATUS_LABEL[r.status]}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold">Items</h2>
            <ul className="mt-3 divide-y">
              {r.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {i.orderItem.image && <Image src={i.orderItem.image} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{i.orderItem.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.orderItem.variantName ? `${i.orderItem.variantName} · ` : ""}× {i.quantity}
                      {r.type === "EXCHANGE" && i.exchangeLabel && <> → <span className="font-medium text-foreground">{i.exchangeLabel}</span></>}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatPrice(Number(i.orderItem.price) * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border bg-card p-4 text-sm">
            <h2 className="font-semibold">Customer&apos;s reason</h2>
            <p className="mt-2 font-medium">{r.reason}</p>
            {r.customerNote && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{r.customerNote}</p>}
            {r.adminNote && (
              <p className="mt-3 rounded-md bg-muted/50 p-2 text-muted-foreground">
                <span className="font-medium text-foreground">Shop note:</span> {r.adminNote}
              </p>
            )}
          </section>
          <section className="rounded-lg border bg-card p-4 text-sm">
            <h2 className="font-semibold">Customer</h2>
            <p className="mt-2">{o.address?.fullName ?? o.user.name}</p>
            <p className="text-muted-foreground">{o.address?.phone ?? o.user.phone}</p>
            <p className="text-muted-foreground">
              {[o.address?.line1, o.address?.city, o.address?.state].filter(Boolean).join(", ")}
            </p>
          </section>
        </div>
        <aside className="space-y-4">
          <ReturnActions
            canRefund={canRefund}
            id={r.id}
            type={r.type}
            status={r.status}
            restocked={r.restocked}
            refunded={r.refundedAt ? { amount: formatPrice(Number(r.refundAmount ?? 0)), method: r.refundMethod ?? "", reference: r.refundReference } : null}
            suggestedRefund={Math.min(itemsValue, refundLeft)}
            refundLeft={refundLeft}
            gateway={gateway}
            methods={[...REFUND_METHODS]}
            replacementOrderId={r.replacementOrderId}
          />
          <div className="rounded-lg border bg-card p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order total</span>
              <span className="tabular-nums">{formatPrice(Number(o.total))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refunded so far</span>
              <span className="tabular-nums">{formatPrice(Number(o.refundedAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid with</span>
              <span>{o.paymentMethod === "COD" ? "Cash on delivery" : o.paymentMethod}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
