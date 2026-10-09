import { CheckCircle2, Circle, Truck, XCircle } from "lucide-react";
import { COURIER_LABEL, trackingUrl, type CourierId } from "@/lib/couriers/common";
import { courierStatusText, PROGRESS_STEPS, progressStep, type CustomerOrderState } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma";

type Props = {
  order: CustomerOrderState & {
    events: { status: OrderStatus }[];
    courier: string | null;
    trackingNumber: string | null;
    courierStatus?: string | null;
    courierUpdatedAt?: Date | null;
    phone?: string | null;
  };
};

/** Placed → Confirmed → On the way → Delivered, plus the courier and its tracking link. */
export function OrderProgress({ order }: Props) {
  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const step = progressStep(order);
  const trackUrl = trackingUrl(order.courier, order.trackingNumber, order.phone);
  // "booking" is our own in-flight marker, not the courier's word.
  const courierNow = order.courierStatus === "booking" ? null : courierStatusText(order.courierStatus);
  return (
    <>
      {cancelled ? (
        <div className="flex items-center gap-3 text-sm">
          <XCircle className="size-5 text-destructive" />
          <span>This order was {order.status === "REFUNDED" ? "refunded" : "cancelled"}.</span>
        </div>
      ) : (
        <ol className="grid grid-cols-4 gap-1">
          {PROGRESS_STEPS.map((label, i) => {
            const done = i <= step;
            return (
              <li key={label} className="flex flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : done ? "bg-primary" : "bg-border"}`} />
                  {done ? (
                    <CheckCircle2 className="size-6 shrink-0 text-primary" />
                  ) : (
                    <Circle className="size-6 shrink-0 text-muted-foreground/40" />
                  )}
                  <span
                    className={`h-0.5 flex-1 ${i === PROGRESS_STEPS.length - 1 ? "invisible" : i < step ? "bg-primary" : "bg-border"}`}
                  />
                </div>
                <span className={`mt-1.5 text-xs sm:text-sm ${done ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
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
          {courierNow && (
            <span className="basis-full text-xs text-muted-foreground">
              Courier says: <span className="font-medium text-foreground">{courierNow}</span>
              {order.courierUpdatedAt && (
                <>
                  {" "}·{" "}
                  {order.courierUpdatedAt.toLocaleString("en-GB", {
                    timeZone: "Asia/Dhaka",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </>
              )}
            </span>
          )}
        </div>
      )}
    </>
  );
}
