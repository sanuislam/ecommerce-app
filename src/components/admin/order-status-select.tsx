"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/generated/prisma";

const KEEP = "__keep__";

/**
 * Admin control for moving an order to one of its allowed next statuses
 * (computed on the server) and editing courier / tracking details.
 */
export function OrderStatusSelect({
  orderId,
  currentLabel,
  allowed,
  courier: initialCourier,
  trackingNumber: initialTracking,
  refundHint,
}: {
  orderId: string;
  currentLabel: string;
  allowed: Array<{ value: OrderStatus; label: string }>;
  courier: string | null;
  trackingNumber: string | null;
  /** Shown when REFUNDED is hidden because the bKash refund button must be used. */
  refundHint?: string;
}) {
  const router = useRouter();
  const [next, setNext] = useState<string>(KEEP);
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState(initialCourier ?? "");
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [saving, setSaving] = useState(false);

  const statusChosen = next !== KEEP;
  const shippingChanged =
    courier.trim() !== (initialCourier ?? "") ||
    tracking.trim() !== (initialTracking ?? "");
  const dirty = statusChosen || shippingChanged;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      const body: Record<string, string> = {
        courier: courier.trim(),
        trackingNumber: tracking.trim(),
      };
      if (statusChosen) {
        body.status = next;
        if (note.trim()) body.note = note.trim();
      }
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not update order");
        return;
      }
      toast.success(statusChosen ? "Order status updated" : "Shipping details saved");
      setNext(KEEP);
      setNote("");
      router.refresh();
    } catch {
      toast.error("Could not update order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="order-next-status">Change status</Label>
        <Select value={next} onValueChange={setNext} disabled={saving || allowed.length === 0}>
          <SelectTrigger id="order-next-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KEEP}>Keep: {currentLabel}</SelectItem>
            {allowed.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allowed.length === 0 && (
          <p className="text-xs text-muted-foreground">
            This order is final; its status can no longer change.
          </p>
        )}
        {refundHint && <p className="text-xs text-muted-foreground">{refundHint}</p>}
      </div>

      {statusChosen && (
        <div className="grid gap-1.5">
          <Label htmlFor="order-note">Note (optional)</Label>
          <Textarea
            id="order-note"
            rows={2}
            maxLength={300}
            placeholder="Shown on the order timeline"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="grid gap-1.5">
          <Label htmlFor="order-courier">Courier</Label>
          <Input
            id="order-courier"
            maxLength={60}
            placeholder="e.g. Pathao, Steadfast"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="order-tracking">Tracking number</Label>
          <Input
            id="order-tracking"
            maxLength={80}
            autoComplete="off"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={saving || !dirty} className="w-full sm:w-auto sm:justify-self-end lg:w-full">
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        {statusChosen ? "Update order" : "Save shipping details"}
      </Button>
    </form>
  );
}
