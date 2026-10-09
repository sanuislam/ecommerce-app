"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

/** Promotional SMS on/off for one customer (order messages are not affected). */
export function SmsOptOutToggle({ userId, optedOut }: { userId: string; optedOut: boolean }) {
  const [out, setOut] = useState(optedOut);
  const [busy, setBusy] = useState(false);
  return (
    <Switch
      checked={!out}
      disabled={busy}
      aria-label="Promotional SMS"
      onCheckedChange={async (on) => {
        setBusy(true);
        try {
          const res = await fetch(`/api/admin/customer-sms/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optOut: !on }),
          });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not save");
          setOut(!on);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
