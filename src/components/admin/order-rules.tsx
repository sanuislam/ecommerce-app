"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Rules = {
  codOtpRequired: boolean;
  codMaxAmount: number | null;
  returnsEnabled: boolean;
  returnWindowDays: number;
  lowStockDefault: number;
};

export function OrderRulesForm({ initial, smsReady }: { initial: Rules; smsReady: boolean }) {
  const router = useRouter();
  const [otp, setOtp] = useState(initial.codOtpRequired);
  const [max, setMax] = useState(initial.codMaxAmount != null ? String(initial.codMaxAmount) : "");
  const [returns, setReturns] = useState(initial.returnsEnabled);
  const [days, setDays] = useState(String(initial.returnWindowDays));
  const [lowAt, setLowAt] = useState(String(initial.lowStockDefault));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/order-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codOtpRequired: otp,
          codMaxAmount: max.trim() === "" ? null : Math.round(Number(max)),
          returnsEnabled: returns,
          returnWindowDays: Math.round(Number(days)) || 7,
          lowStockDefault: Math.max(0, Math.round(Number(lowAt)) || 0),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success("Order rules saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Cash on delivery</h2>
      <div className="mt-4 grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Confirm the phone with an SMS code</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Customers type a 6-digit code sent to their delivery number before a cash on delivery order is placed.
              Those orders arrive already confirmed. Each code is one SMS.
              {!smsReady && (
                <>
                  {" "}
                  <span className="text-amber-700 dark:text-amber-400">
                    Needs SMS to be set up in <Link href="/admin/sms" className="underline">Admin → SMS</Link>.
                  </span>
                </>
              )}
            </p>
          </div>
          <Switch checked={otp} onCheckedChange={setOtp} aria-label="Ask for an SMS code" />
        </div>
        <div className="grid gap-1.5 sm:max-w-xs">
          <Label htmlFor="codmax">Highest order total for cash on delivery (৳)</Label>
          <Input id="codmax" inputMode="numeric" placeholder="No limit" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
          <p className="text-xs text-muted-foreground">Bigger orders must be paid with mobile banking. Empty = no limit.</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Returns and exchanges</h2>
      <div className="mt-4 grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Customers can ask for a return or exchange</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              From their order page, after delivery. You review every request in Admin → Returns.
            </p>
          </div>
          <Switch checked={returns} onCheckedChange={setReturns} aria-label="Allow return requests" />
        </div>
        <div className="grid gap-1.5 sm:max-w-xs">
          <Label htmlFor="days">Days after delivery</Label>
          <Input id="days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Stock</h2>
      <div className="mt-4 grid gap-1.5 sm:max-w-xs">
        <Label htmlFor="lowat">Warn when stock is at or below</Label>
        <Input id="lowat" inputMode="numeric" value={lowAt} onChange={(e) => setLowAt(e.target.value.replace(/\D/g, ""))} />
        <p className="text-xs text-muted-foreground">For products without their own warning level.</p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
        </Button>
      </div>
    </section>
  );
}

type Row = { id: string; phone: string; reason: string; at: string };

export function BlocklistManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  async function add() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not block");
      toast.success("Number blocked");
      setPhone("");
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not block");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Allow cash on delivery for this number again?")) return;
    await fetch(`/api/admin/blocklist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    toast.success("Number unblocked");
    router.refresh();
  }

  const shown = rows.filter((r) => !q || r.phone.includes(q.replace(/\D/g, "")) || r.reason.toLowerCase().includes(q.toLowerCase()));

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Ban className="size-4" /> Blocked numbers
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        These numbers can still order, but only by paying with mobile banking first.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
        <Input inputMode="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
        <Input placeholder="Reason (optional)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
        <Button onClick={() => void add()} disabled={busy || phone.replace(/\D/g, "").length < 10}>
          {busy && <Loader2 className="size-4 animate-spin" />} Block
        </Button>
      </div>
      {rows.length > 8 && (
        <Input className="mt-3 sm:max-w-xs" placeholder="Search blocked numbers" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No blocked numbers.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border text-sm">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-2.5">
              <span className="w-32 font-medium tabular-nums">{r.phone}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.reason || "—"}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{r.at}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Unblock ${r.phone}`} onClick={() => void remove(r.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
