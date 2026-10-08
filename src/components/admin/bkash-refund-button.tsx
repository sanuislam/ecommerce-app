"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PROVIDERS = {
  bkash: { label: "bKash", endpoint: "/api/admin/payments/bkash/refund" },
  upay: { label: "Upay", endpoint: "/api/admin/payments/upay/refund" },
} as const;

export function BkashRefundButton({
  orderId,
  amount,
  provider = "bkash",
}: {
  orderId: string;
  amount: number;
  provider?: keyof typeof PROVIDERS;
}) {
  const p = PROVIDERS[provider];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function refund() {
    setPending(true);
    try {
      const res = await fetch(p.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason: reason.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        refundTrxID?: string;
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Refund failed");
        return;
      }
      toast.success(
        data.refundTrxID
          ? `Refunded · ${data.refundTrxID}`
          : (data.message ?? "Refund issued"),
      );
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Refund request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Undo2 className="size-4" />
          Refund via {p.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refund ৳{amount.toFixed(2)} to customer?</AlertDialogTitle>
          <AlertDialogDescription>
            Issues a full refund through {p.label} for the original transaction. The
            order status will be set to REFUNDED. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="refund-reason">Reason (optional)</Label>
          <Textarea
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Item out of stock"
            maxLength={255}
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void refund();
            }}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Confirm refund"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
