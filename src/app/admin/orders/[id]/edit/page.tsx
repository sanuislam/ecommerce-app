import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getShippingConfig } from "@/lib/site-settings";
import { OrderEditor } from "@/components/admin/order-editor";
import { orderNo } from "@/lib/order-number";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditOrderPage({ params }: Props) {
  const { id } = await params;
  const [order, shippingConfig] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: { items: true, address: true, user: { select: { name: true, phone: true } } },
    }),
    getShippingConfig(),
  ]);
  if (!order) notFound();

  const editable = ["PENDING", "PAID"].includes(order.status) && !order.courierConsignmentId;
  const lockTotal = order.status === "PAID" && !!(order.bkashPaymentId || order.upayTxnId || order.stripeId);

  return (
    <div className="p-4 sm:p-6">
      <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Order {orderNo(order)}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit order</h1>
      {!editable ? (
        <p className="mt-4 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          {order.courierConsignmentId
            ? "This order is already booked with a courier, so it can't be edited here."
            : "Only orders that haven't shipped can be edited."}
        </p>
      ) : (
        <div className="mt-6">
          <OrderEditor
            mode="edit"
            orderId={order.id}
            shippingConfig={shippingConfig}
            lockTotal={lockTotal}
            initial={{
              address: {
                fullName: order.address?.fullName ?? order.user.name ?? "",
                phone: order.address?.phone ?? order.user.phone ?? "",
                district: order.address?.state ?? "",
                area: order.address?.city ?? "",
                line1: order.address?.line1 ?? "",
                line2: order.address?.line2 ?? "",
                postalCode: order.address?.postalCode ?? "",
              },
              lines: order.items.map((i) => ({
                productId: i.productId,
                variantId: i.variantId,
                name: i.name,
                variantName: i.variantName,
                image: i.image,
                price: Number(i.price),
                quantity: i.quantity,
              })),
              shipping: Number(order.shipping),
              discount: Number(order.discount),
              notes: order.notes ?? "",
            }}
          />
        </div>
      )}
    </div>
  );
}
