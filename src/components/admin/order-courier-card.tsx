"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Loader2, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourierBookDialog } from "@/components/admin/courier-book-dialog";

/** Courier status of one order, with booking and a status refresh. */
export function OrderCourierCard({
  orderId,
  courierLabel,
  consignment,
  tracking,
  trackingUrl,
  status,
  updatedAt,
  charge,
  canBook,
  bookHint,
  address,
}: {
  orderId: string;
  courierLabel: string | null;
  consignment: string | null;
  tracking: string | null;
  trackingUrl: string | null;
  status: string | null;
  updatedAt: string | null;
  charge: string | null;
  canBook: boolean;
  bookHint: string | null;
  address: { district: string | null; area: string | null; postCode: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/couriers/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Status check failed");
      toast.success(`Courier status: ${data.status}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status check failed");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h3 className="flex items-center gap-2 font-semibold">
        <Truck className="size-4" /> Courier
      </h3>
      {consignment ? (
        <dl className="mt-2 space-y-1">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Courier</dt>
            <dd className="font-medium">{courierLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Tracking</dt>
            <dd className="font-mono text-xs break-all">
              {trackingUrl ? (
                <a href={trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                  {tracking} <ExternalLink className="size-3" />
                </a>
              ) : (
                tracking
              )}
            </dd>
          </div>
          {tracking !== consignment && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Consignment</dt>
              <dd className="font-mono text-xs">{consignment}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-right font-medium">{status || "—"}</dd>
          </div>
          {charge && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Delivery charge</dt>
              <dd>{charge}</dd>
            </div>
          )}
          {updatedAt && <p className="pt-1 text-xs text-muted-foreground">Updated {updatedAt}</p>}
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh status
          </Button>
        </dl>
      ) : (
        <>
          <p className="mt-2 text-muted-foreground">
            {canBook ? "Not booked yet." : (bookHint ?? "This order can't be booked.")}
          </p>
          {canBook && (
            <Button size="sm" className="mt-3 w-full" onClick={() => setOpen(true)}>
              <Truck className="size-4" /> Book courier
            </Button>
          )}
          <CourierBookDialog
            open={open}
            onOpenChange={setOpen}
            orderIds={[orderId]}
            address={address}
            onDone={() => router.refresh()}
          />
        </>
      )}
    </div>
  );
}
