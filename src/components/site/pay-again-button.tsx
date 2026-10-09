"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens bKash again for an order the shopper left half-way. */
export function PayAgainButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      className="w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
          const data = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
          if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? "Could not open bKash");
          window.location.assign(data.checkoutUrl);
        } catch (err) {
          toast.error((err as Error).message);
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />} Pay with bKash now
    </Button>
  );
}
