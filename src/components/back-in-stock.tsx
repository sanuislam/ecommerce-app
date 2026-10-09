"use client";

import { useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Sold out: leave a mobile number and get one SMS when it's back. */
export function BackInStock({ productId, variantId, label }: { productId: string; variantId: string | null; label: string }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const key = `${productId}:${variantId ?? ""}`;
  if (done === key) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Check className="size-4" /> We&apos;ll text you when {label} is back.
      </p>
    );
  }
  return (
    <form
      className="rounded-md border border-dashed p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const res = await fetch("/api/stock-alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, variantId, phone }),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? "Could not save");
          setDone(key);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <BellRing className="size-4" /> Tell me when it&apos;s back
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          type="tel"
          inputMode="tel"
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-label="Mobile number for the back-in-stock SMS"
          required
        />
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Notify me
        </Button>
      </div>
    </form>
  );
}
