"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SmsOffersToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor="sms-offers" className="text-sm font-medium">
          Offers by SMS
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Discounts, new arrivals and reminders about items left in your cart. Messages about your orders always come.
        </p>
      </div>
      <Switch
        id="sms-offers"
        checked={on}
        disabled={busy}
        onCheckedChange={async (v) => {
          setBusy(true);
          try {
            const res = await fetch("/api/account/marketing", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ smsOffers: v }),
            });
            if (!res.ok) throw new Error();
            setOn(v);
            toast.success(v ? "You'll get offers by SMS" : "No more offer SMS");
          } catch {
            toast.error("Could not save. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
