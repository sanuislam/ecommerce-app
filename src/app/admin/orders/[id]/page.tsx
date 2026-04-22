import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { MFS_LABELS, type MfsMethod } from "@/lib/mfs";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: true, address: true },
  });
  if (!order) notFound();

  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {order.user.email} · {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusSelect orderId={order.id} status={order.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="mt-3 divide-y">
            {order.items.map((i) => (
              <div key={i.id} className="flex gap-3 py-3">
                {i.image && (
                  <div className="relative size-16 overflow-hidden rounded-md bg-muted">
                    <Image src={i.image} alt={i.name} fill sizes="64px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Qty {i.quantity} · {formatPrice(Number(i.price))} each
                  </div>
                </div>
                <div className="font-semibold">
                  {formatPrice(Number(i.price) * i.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Summary</h3>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatPrice(Number(order.shipping))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatPrice(Number(order.tax))}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-semibold">Payment</h3>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium">
                {order.paymentMethod === "STRIPE"
                  ? "Card (Stripe)"
                  : order.paymentMethod === "COD"
                    ? "Cash on Delivery"
                    : MFS_LABELS[order.paymentMethod as MfsMethod]}
              </span>
            </div>
            {order.paymentSenderNumber && (
              <div className="mt-1 flex justify-between">
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
          </div>
          {order.address && (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <h3 className="font-semibold">Shipping address</h3>
              <div className="mt-2 text-muted-foreground">
                <div>{order.address.fullName}</div>
                <div>{order.address.line1}</div>
                {order.address.line2 && <div>{order.address.line2}</div>}
                <div>
                  {order.address.city}
                  {order.address.state ? `, ${order.address.state}` : ""} {order.address.postalCode}
                </div>
                <div>{order.address.country}</div>
                {order.address.phone && <div>{order.address.phone}</div>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
