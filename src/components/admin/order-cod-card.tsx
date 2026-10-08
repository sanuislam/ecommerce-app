"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, Loader2, PhoneCall, PhoneMissed, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type RiskView = {
  orders: number;
  delivered: number;
  returned: number;
  cancelled: number;
  successRate: number | null;
  blocked: boolean;
};

/** "92% delivered" pill (green / amber / red), "New customer" without history. */
export function RiskBadge({ risk, className }: { risk: RiskView | null; className?: string }) {
  if (!risk) return null;
  if (risk.blocked) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive", className)}>
        <Ban className="size-3" /> Blocked
      </span>
    );
  }
  if (risk.successRate == null) {
    return (
      <span className={cn("inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground", className)}>
        {risk.orders <= 1 ? "New customer" : `${risk.orders} orders, none delivered yet`}
      </span>
    );
  }
  const pct = Math.round(risk.successRate * 100);
  const tone =
    pct >= 80
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
      : pct >= 50
        ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
        : "bg-destructive/15 text-destructive";
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", tone, className)}
      title={`${risk.delivered} delivered, ${risk.returned} returned, ${risk.cancelled} cancelled before shipping`}
    >
      {pct}% delivered · {risk.delivered}/{risk.delivered + risk.returned}
    </span>
  );
}

/** Calling a cash-on-delivery customer before shipping: confirm, no answer, fake. */
export function OrderCodCard({
  orderId,
  phone,
  confirmedAt,
  attempts,
  note,
  pending,
  risk,
}: {
  orderId: string;
  phone: string | null;
  confirmedAt: string | null;
  attempts: number;
  note: string | null;
  pending: boolean;
  risk: RiskView | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [block, setBlock] = useState(true);
  const [fakeOpen, setFakeOpen] = useState(false);

  async function act(action: "confirm" | "no_answer" | "fake") {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: text, block }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success(action === "confirm" ? "Order confirmed" : action === "no_answer" ? "Call attempt saved" : "Order cancelled");
      setText("");
      setFakeOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <PhoneCall className="size-4" /> Cash on delivery check
        </h3>
      </div>
      <div className="mt-2">
        <RiskBadge risk={risk} />
        {risk && risk.orders > 1 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {risk.orders} orders from this number · {risk.delivered} delivered · {risk.returned} returned ·{" "}
            {risk.cancelled} cancelled
          </p>
        )}
      </div>

      {confirmedAt ? (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-emerald-500/10 p-2 text-emerald-900 dark:text-emerald-200">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>
            Confirmed {confirmedAt}
            {note && <span className="block text-xs opacity-80">{note}</span>}
          </span>
        </p>
      ) : pending ? (
        <div className="mt-3 grid gap-2">
          <p className="text-muted-foreground">
            Call {phone ? <a href={`tel:${phone}`} className="font-medium text-foreground underline">{phone}</a> : "the customer"} to confirm before shipping.
            {attempts > 0 && (
              <span className="block text-xs">
                {attempts} unanswered call{attempts === 1 ? "" : "s"}
                {note ? ` · ${note}` : ""}
              </span>
            )}
          </p>
          <Input placeholder="Note (optional)" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => void act("confirm")} disabled={!!busy}>
              {busy === "confirm" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Confirmed
            </Button>
            <Button size="sm" variant="outline" onClick={() => void act("no_answer")} disabled={!!busy}>
              {busy === "no_answer" ? <Loader2 className="size-4 animate-spin" /> : <PhoneMissed className="size-4" />} No answer
            </Button>
          </div>
          {fakeOpen ? (
            <div className="grid gap-2 rounded-md border border-destructive/30 p-2">
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={block} onCheckedChange={(v) => setBlock(v === true)} />
                Also block this number from cash on delivery
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="destructive" onClick={() => void act("fake")} disabled={!!busy}>
                  {busy === "fake" && <Loader2 className="size-4 animate-spin" />} Cancel order
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFakeOpen(false)}>
                  Keep
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setFakeOpen(true)}>
              <ShieldAlert className="size-4" /> Fake or refused
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Not confirmed before shipping.</p>
      )}
    </div>
  );
}
