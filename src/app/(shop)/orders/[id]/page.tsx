import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import { Role } from "@/generated/prisma";
import { ClearCartOnSuccess } from "@/components/site/clear-cart-on-success";
import { MFS_LABELS, type MfsMethod } from "@/lib/mfs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const [{ id }, { success }] = await Promise.all([params, searchParams]);
  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, address: true, user: true },
  });
  if (!order) notFound();

  const isOwner = order.userId === session.user.id;
  const isAdmin = session.user.role === Role.ADMIN;
  if (!isOwner && !isAdmin) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {success && <ClearCartOnSuccess />}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
          <div>
            <div className="font-semibold">Thanks for your order!</div>
            <div className="text-sm text-muted-foreground">
              A confirmation has been sent to {order.user.email}.
            </div>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge
          variant={
            order.status === "PAID" || order.status === "DELIVERED"
              ? "default"
              : order.status === "CANCELLED"
                ? "destructive"
                : "secondary"
          }
        >
          {order.status}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="mt-3 divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 py-3">
                {item.image && (
                  <div className="relative size-16 overflow-hidden rounded-md bg-muted">
                    <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Qty {item.quantity} · {formatPrice(Number(item.price))} each
                  </div>
                </div>
                <div className="font-semibold">
                  {formatPrice(Number(item.price) * item.quantity)}
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
            {order.paymentTransactionId && (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">TrxID</span>
                <span className="break-all font-mono">{order.paymentTransactionId}</span>
              </div>
            )}
            {order.status === "PENDING" &&
              order.paymentMethod !== "STRIPE" &&
              order.paymentMethod !== "COD" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Awaiting payment verification. You&apos;ll be notified once confirmed.
                </p>
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
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
