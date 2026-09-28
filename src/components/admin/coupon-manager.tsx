"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";

export type CouponView = {
  id: string;
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
};

type FormState = {
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

const EMPTY: FormState = {
  code: "",
  description: "",
  type: "PERCENT",
  value: "",
  minSubtotal: "0",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

async function apiError(res: Response, fallback: string) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

/** ISO → value for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

function describeValue(c: CouponView) {
  if (c.type === "PERCENT") {
    return `${c.value}% off${c.maxDiscount ? ` (max ${formatPrice(c.maxDiscount)})` : ""}`;
  }
  return `${formatPrice(c.value)} off`;
}

function validity(c: CouponView) {
  if (!c.startsAt && !c.endsAt) return "Always";
  if (c.startsAt && c.endsAt) return `${fmtDate(c.startsAt)} → ${fmtDate(c.endsAt)}`;
  if (c.startsAt) return `From ${fmtDate(c.startsAt)}`;
  return `Until ${fmtDate(c.endsAt!)}`;
}

function status(c: CouponView, now: number) {
  if (!c.active) return { label: "Off", variant: "secondary" as const };
  if (c.endsAt && new Date(c.endsAt).getTime() < now)
    return { label: "Expired", variant: "destructive" as const };
  if (c.startsAt && new Date(c.startsAt).getTime() > now)
    return { label: "Scheduled", variant: "outline" as const };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit)
    return { label: "Used up", variant: "destructive" as const };
  return { label: "Live", variant: "default" as const };
}

export function CouponManager({
  coupons,
  now,
}: {
  coupons: CouponView[];
  /** Server time (ms) used for the Live/Expired badges, so SSR and client agree. */
  now: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CouponView | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(c: CouponView) {
    setEditing(c);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Discount codes customers can enter at checkout.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> New coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No coupons yet. Create one to offer a discount.
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 lg:grid-cols-2">
          {coupons.map((c) => {
            const s = status(c, now);
            return (
              <li key={c.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-semibold break-all">
                        {c.code}
                      </span>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    {c.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <ActiveSwitch coupon={c} onChanged={() => router.refresh()} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Discount</dt>
                    <dd className="font-medium">{describeValue(c)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Min. spend</dt>
                    <dd>{c.minSubtotal > 0 ? formatPrice(c.minSubtotal) : "None"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Used</dt>
                    <dd>
                      {c.usedCount} / {c.usageLimit ?? "∞"}
                      {c.perUserLimit ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {c.perUserLimit}/customer
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs text-muted-foreground">Valid</dt>
                    <dd>{validity(c)}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <DeleteCouponButton coupon={c} onDeleted={() => router.refresh()} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {open && (
            <CouponForm
              key={editing?.id ?? "new"}
              coupon={editing}
              onSaved={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActiveSwitch({
  coupon,
  onChanged,
}: {
  coupon: CouponView;
  onChanged: () => void;
}) {
  const [checked, setChecked] = useState(coupon.active);
  const [pending, setPending] = useState(false);

  async function toggle(next: boolean) {
    setChecked(next);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) throw new Error(await apiError(res, "Could not update coupon"));
      toast.success(`${coupon.code} ${next ? "activated" : "deactivated"}`);
      onChanged();
    } catch (err) {
      setChecked(!next);
      toast.error(err instanceof Error ? err.message : "Could not update coupon");
    } finally {
      setPending(false);
    }
  }

  const id = `active-${coupon.id}`;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        Active
      </Label>
      <Switch id={id} checked={checked} disabled={pending} onCheckedChange={toggle} />
    </div>
  );
}

function DeleteCouponButton({
  coupon,
  onDeleted,
}: {
  coupon: CouponView;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await apiError(res, "Could not delete coupon"));
      toast.success(`Deleted ${coupon.code}`);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete coupon");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={pending}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete coupon {coupon.code}?</AlertDialogTitle>
          <AlertDialogDescription>
            Customers will no longer be able to use it. Past orders keep the code
            and discount they were placed with.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={remove} disabled={pending}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CouponForm({
  coupon,
  onSaved,
}: {
  coupon: CouponView | null;
  onSaved: () => void;
}) {
  const [v, setV] = useState<FormState>(() =>
    coupon
      ? {
          code: coupon.code,
          description: coupon.description,
          type: coupon.type,
          value: String(coupon.value),
          minSubtotal: String(coupon.minSubtotal),
          maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
          usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
          perUserLimit: coupon.perUserLimit != null ? String(coupon.perUserLimit) : "",
          startsAt: toLocalInput(coupon.startsAt),
          endsAt: toLocalInput(coupon.endsAt),
          active: coupon.active,
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(k: K, val: FormState[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(v.value);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Value must be greater than 0");
      return;
    }
    if (v.type === "PERCENT" && value > 100) {
      toast.error("Percentage cannot be more than 100");
      return;
    }
    const payload = {
      code: v.code.trim().toUpperCase(),
      description: v.description.trim(),
      type: v.type,
      value,
      minSubtotal: Number(v.minSubtotal || 0),
      maxDiscount: v.type === "PERCENT" ? numOrNull(v.maxDiscount) : null,
      usageLimit: numOrNull(v.usageLimit),
      perUserLimit: numOrNull(v.perUserLimit),
      startsAt: fromLocalInput(v.startsAt),
      endsAt: fromLocalInput(v.endsAt),
      active: v.active,
    };
    setSaving(true);
    try {
      const res = await fetch(
        coupon ? `/api/admin/coupons/${coupon.id}` : "/api/admin/coupons",
        {
          method: coupon ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(await apiError(res, "Could not save coupon"));
      toast.success(coupon ? "Coupon updated" : "Coupon created");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save coupon");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{coupon ? `Edit ${coupon.code}` : "New coupon"}</DialogTitle>
        <DialogDescription>
          Codes are case-insensitive and stored in capitals.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="c-code">Code</Label>
          <Input
            id="c-code"
            required
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="EID10"
            className="font-mono uppercase"
            value={v.code}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="c-desc">Description (optional)</Label>
          <Input
            id="c-desc"
            placeholder="10% off for Eid"
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-type">Type</Label>
          <Select value={v.type} onValueChange={(t) => set("type", t as FormState["type"])}>
            <SelectTrigger id="c-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">Percentage (%)</SelectItem>
              <SelectItem value="FIXED">Fixed amount (৳)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-value">{v.type === "PERCENT" ? "Percent off" : "Amount off (৳)"}</Label>
          <Input
            id="c-value"
            required
            type="number"
            inputMode="decimal"
            min="0.01"
            max={v.type === "PERCENT" ? 100 : undefined}
            step="0.01"
            value={v.value}
            onChange={(e) => set("value", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-min">Minimum spend (৳)</Label>
          <Input
            id="c-min"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={v.minSubtotal}
            onChange={(e) => set("minSubtotal", e.target.value)}
          />
        </div>
        {v.type === "PERCENT" && (
          <div className="grid gap-1.5">
            <Label htmlFor="c-max">Max discount (৳, optional)</Label>
            <Input
              id="c-max"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="No cap"
              value={v.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
            />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="c-limit">Total uses (optional)</Label>
          <Input
            id="c-limit"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="Unlimited"
            value={v.usageLimit}
            onChange={(e) => set("usageLimit", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-peruser">Uses per customer (optional)</Label>
          <Input
            id="c-peruser"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="Unlimited"
            value={v.perUserLimit}
            onChange={(e) => set("perUserLimit", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-start">Starts (optional)</Label>
          <Input
            id="c-start"
            type="datetime-local"
            value={v.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-end">Ends (optional)</Label>
          <Input
            id="c-end"
            type="datetime-local"
            value={v.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch
            id="c-active"
            checked={v.active}
            onCheckedChange={(b) => set("active", Boolean(b))}
          />
          <Label htmlFor="c-active">Active</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : coupon ? "Save changes" : "Create coupon"}
        </Button>
      </DialogFooter>
    </form>
  );
}
