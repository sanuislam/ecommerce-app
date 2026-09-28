import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/generated/prisma";

const LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant={
        status === "DELIVERED" || status === "PAID"
          ? "default"
          : status === "CANCELLED" || status === "REFUNDED"
            ? "destructive"
            : "secondary"
      }
    >
      {LABEL[status]}
    </Badge>
  );
}
