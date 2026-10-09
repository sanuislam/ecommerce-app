"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { smsInfo } from "@/lib/sms-count";

type Cart = {
  id: string;
  customer: string;
  email: string;
  phone: string | null;
  optOut: boolean;
  items: string[];
  value: number;
  updatedAt: string;
  remindedAt: string | null;
  reminderCount: number;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const money = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

export function CartsTable({
  carts,
  smsReady,
  defaultCoupon,
  maxReminders,
}: {
  carts: Cart[];
  smsReady: boolean;
  defaultCoupon: string;
  maxReminders: number;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [coupon, setCoupon] = useState(defaultCoupon);
  const [busy, setBusy] = useState(false);
  // Now, read once per render of the list (cart ages are shown relative to it).
  const [now] = useState(() => Date.now());

  const canRemind = (c: Cart) =>
    !!c.phone &&
    !c.optOut &&
    c.reminderCount < maxReminders &&
    (!c.remindedAt || now - Date.parse(c.remindedAt) > 24 * 3600_000);
  const eligible = useMemo(() => carts.filter(canRemind).map((c) => c.id), [carts]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/carts/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, couponCode: coupon }),
      });
      const data = (await res.json().catch(() => ({}))) as { sent?: number; failed?: { error?: string }[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send");
      if (data.sent) toast.success(`${data.sent} reminder${data.sent === 1 ? "" : "s"} sent`);
      if (data.failed?.length) toast.error(`${data.failed.length} not sent: ${data.failed[0]?.error ?? ""}`);
      setPicked(new Set());
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b p-3">
        <div className="grid gap-1">
          <Label htmlFor="cart-coupon" className="text-xs text-muted-foreground">
            Coupon in the message (optional)
          </Label>
          <Input
            id="cart-coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="e.g. COMEBACK10"
            className="h-8 w-44 font-mono"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || !smsReady || !eligible.length}
            onClick={() => {
              if (confirm(`Send a reminder SMS to ${eligible.length} customer${eligible.length === 1 ? "" : "s"}?`)) void send(eligible);
            }}
          >
            Remind all on this page ({eligible.length})
          </Button>
          <Button type="button" size="sm" disabled={busy || !smsReady || !picked.size} onClick={() => send([...picked])}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Remind selected ({picked.size})
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 p-3" />
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">In the cart</th>
              <th className="p-3 text-right font-medium">Value</th>
              <th className="p-3 font-medium">Last change</th>
              <th className="p-3 font-medium">Reminder</th>
            </tr>
          </thead>
          <tbody>
            {carts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No abandoned carts right now.
                </td>
              </tr>
            ) : (
              carts.map((c) => {
                const ok = canRemind(c);
                return (
                  <tr key={c.id} className="border-b align-top last:border-0">
                    <td className="p-3">
                      <Checkbox
                        checked={picked.has(c.id)}
                        disabled={!ok}
                        aria-label={`Select ${c.customer}`}
                        onCheckedChange={(v) =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(c.id);
                            else next.delete(c.id);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{c.customer}</div>
                      <div className="text-xs text-muted-foreground">{c.phone ?? "No mobile number"}</div>
                    </td>
                    <td className="max-w-xs p-3 text-xs">
                      {c.items.slice(0, 3).map((i) => (
                        <div key={i} className="truncate">
                          {i}
                        </div>
                      ))}
                      {c.items.length > 3 ? <div className="text-muted-foreground">+{c.items.length - 3} more</div> : null}
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums">{money(c.value)}</td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{when(c.updatedAt)}</td>
                    <td className="p-3 text-xs">
                      {c.optOut ? (
                        <span className="text-muted-foreground">Said no to promo SMS</span>
                      ) : c.remindedAt ? (
                        <span>
                          Sent {when(c.remindedAt)}
                          {c.reminderCount > 1 ? ` (${c.reminderCount}×)` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not yet</span>
                      )}
                      {ok ? (
                        <button
                          type="button"
                          disabled={busy || !smsReady}
                          className="ml-2 underline disabled:opacity-50"
                          onClick={() => send([c.id])}
                        >
                          {c.remindedAt ? "Again" : "Send"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CartReminderForm({
  initial,
  vars,
}: {
  initial: { auto: boolean; afterHours: number; couponCode: string; template: string };
  vars: string[];
}) {
  const router = useRouter();
  const [auto, setAuto] = useState(initial.auto);
  const [hours, setHours] = useState(String(initial.afterHours));
  const [coupon, setCoupon] = useState(initial.couponCode);
  const [tpl, setTpl] = useState(initial.template);
  const [saving, setSaving] = useState(false);
  // The link is ~60 characters; count it so the SMS estimate is honest.
  const info = smsInfo(tpl.replace("{link}", "x".repeat(62)).replace("{items}", "x".repeat(30)).replace("{coupon}", coupon ? ` Use code ${coupon} for a discount.` : ""));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/carts/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto, afterHours: Math.round(Number(hours)) || 3, couponCode: coupon, template: tpl }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success("Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Reminder settings</h2>
      <div className="mt-4 grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Send reminders automatically</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Once a day at about 11 am, every cart from the last 7 days that waited long enough gets one SMS. At most two
              reminders per cart, a day apart. Customers who turned off promotional SMS are skipped.
            </p>
          </div>
          <Switch checked={auto} onCheckedChange={setAuto} aria-label="Automatic reminders" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="hours">A cart counts as abandoned after (hours)</Label>
            <Input id="hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, ""))} className="w-28" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="coupon">Default coupon (optional)</Label>
            <Input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="w-44 font-mono" placeholder="None" />
            <p className="text-xs text-muted-foreground">Create it first in Coupons. A per-customer limit of 1 is a good idea.</p>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tpl">Message</Label>
          <Textarea id="tpl" rows={3} value={tpl} onChange={(e) => setTpl(e.target.value)} maxLength={320} />
          <p className="text-xs text-muted-foreground">
            Fill-ins: {vars.join(" ")} · about {info.chars} characters, {info.parts} SMS{info.unicode ? " (Bangla / Unicode)" : ""} per
            customer
          </p>
        </div>
        <Button type="button" onClick={save} disabled={saving} className="justify-self-start">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
        </Button>
      </div>
    </section>
  );
}
