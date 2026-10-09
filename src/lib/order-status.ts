import type { OrderStatus, PaymentMethod } from "@/generated/prisma";

/** What a customer sees for their order (clearer than the internal status). Client-safe. */
export type CustomerOrderState = {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  codConfirmedAt?: Date | string | null;
};

export function customerStatus(o: CustomerOrderState): { label: string; tone: "info" | "good" | "bad" | "wait" } {
  switch (o.status) {
    case "PENDING":
      if (o.paymentMethod !== "COD") return { label: "Awaiting payment", tone: "wait" };
      return o.codConfirmedAt ? { label: "Confirmed", tone: "good" } : { label: "Order placed", tone: "info" };
    case "PAID":
      return { label: "Confirmed", tone: "good" };
    case "SHIPPED":
      return { label: "On the way", tone: "info" };
    case "DELIVERED":
      return { label: "Delivered", tone: "good" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "bad" };
    case "REFUNDED":
      return { label: "Refunded", tone: "bad" };
  }
}

/** 0 placed · 1 confirmed · 2 shipped · 3 delivered (from status + history). */
export function progressStep(o: CustomerOrderState & { events: { status: OrderStatus }[] }): number {
  const seen = new Set<OrderStatus>([o.status, ...o.events.map((e) => e.status)]);
  if (seen.has("DELIVERED")) return 3;
  if (seen.has("SHIPPED")) return 2;
  if (seen.has("PAID") || (o.paymentMethod === "COD" && o.codConfirmedAt)) return 1;
  return 0;
}

export const PROGRESS_STEPS = ["Placed", "Confirmed", "On the way", "Delivered"] as const;
