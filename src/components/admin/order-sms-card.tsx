"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type SmsLogRow = { id: string; label: string; message: string; status: string; error: string | null; at: string };

/** SMS sent for an order, and a box to send one by hand. */
export function OrderSmsCard({ orderId, logs, enabled }: { orderId: string; logs: SmsLogRow[]; enabled: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, message: msg }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "SMS not sent");
      toast.success("SMS sent");
      setMsg("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SMS not sent");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h3 className="flex items-center gap-2 font-semibold">
        <MessageSquare className="size-4" /> SMS
      </h3>
      {logs.length === 0 ? (
        <p className="mt-2 text-muted-foreground">No SMS sent for this order.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="rounded-md bg-muted/50 p-2">
              <div className="flex justify-between gap-2 text-xs">
                <span className="font-medium">{l.label}</span>
                <span
                  className={cn(
                    l.status === "sent" && "text-emerald-700 dark:text-emerald-400",
                    l.status === "failed" && "text-destructive",
                    l.status === "sending" && "text-muted-foreground",
                  )}
                >
                  {l.status === "sent" ? "Sent" : l.status === "failed" ? "Failed" : "Sending"} · {l.at}
                </span>
              </div>
              <p className="mt-1 text-xs break-words text-muted-foreground">{l.message}</p>
              {l.error && <p className="mt-1 text-xs text-destructive">{l.error}</p>}
            </li>
          ))}
        </ul>
      )}
      {enabled ? (
        <div className="mt-3 grid gap-2">
          <Textarea
            rows={2}
            maxLength={480}
            placeholder="Write a message to the customer"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">{msg.length}/480</span>
            <Button size="sm" variant="outline" onClick={() => void send()} disabled={busy || msg.trim().length < 2}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send SMS
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Turn on SMS in <a href="/admin/sms" className="underline">Admin → SMS</a> to message customers.
        </p>
      )}
    </div>
  );
}
