"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Search, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BD_DISTRICTS, normalizeBdPhone, zoneForDistrict } from "@/lib/districts";
import { shippingFee, type ShippingConfig } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";

type Variant = { id: string; label: string; price: number; stock: number };
type Product = { id: string; name: string; image: string | null; price: number; stock: number; variants: Variant[] };

export type EditorLine = {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  image: string | null;
  price: number;
  quantity: number;
};

export type EditorInitial = {
  address: {
    fullName: string;
    phone: string;
    district: string;
    area: string;
    line1: string;
    line2: string;
    postalCode: string;
  };
  lines: EditorLine[];
  shipping: number | null;
  discount: number;
  notes: string;
};

const SOURCES = [
  { value: "phone", label: "Phone call" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "other", label: "Other" },
];
const METHODS = [
  { value: "COD", label: "Cash on delivery" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "UPAY", label: "Upay" },
];

const field = "grid gap-1.5";
const select = "h-9 w-full rounded-lg border bg-background px-2.5 text-sm";

/** Create (phone / social orders) or edit an order before it ships. */
export function OrderEditor({
  mode,
  orderId,
  initial,
  shippingConfig,
  lockTotal,
}: {
  mode: "new" | "edit";
  orderId?: string;
  initial?: EditorInitial;
  shippingConfig: ShippingConfig;
  /** Paid online: the total must stay the same. */
  lockTotal?: boolean;
}) {
  const router = useRouter();
  const [address, setAddress] = useState(
    initial?.address ?? { fullName: "", phone: "", district: "", area: "", line1: "", line2: "", postalCode: "" },
  );
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<EditorLine[]>(initial?.lines ?? []);
  const [shippingText, setShippingText] = useState(initial?.shipping != null ? String(initial.shipping) : "");
  const [discountText, setDiscountText] = useState(initial?.discount ? String(initial.discount) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [method, setMethod] = useState("COD");
  const [paid, setPaid] = useState(false);
  const [trxId, setTrxId] = useState("");
  const [source, setSource] = useState("phone");
  const [sendSms, setSendSms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ orders: number; cancelled: number } | null>(null);

  const setA = (k: keyof typeof address, v: string) => setAddress((a) => ({ ...a, [k]: v }));

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const autoShipping = address.district
    ? shippingFee(subtotal, zoneForDistrict(address.district), shippingConfig)
    : 0;
  const shipping = shippingText.trim() === "" ? autoShipping : Math.max(0, Number(shippingText) || 0);
  const discount = Math.min(subtotal, Math.max(0, Number(discountText) || 0));
  const total = Math.max(0, subtotal - discount) + shipping;

  async function lookupCustomer() {
    if (mode !== "new" || !normalizeBdPhone(address.phone)) return;
    try {
      const res = await fetch(`/api/admin/customers/lookup?phone=${encodeURIComponent(address.phone)}`);
      const data = (await res.json()) as {
        customer: null | {
          name: string;
          email: string;
          orders: number;
          cancelled: number;
          address: null | { district: string; area: string; line1: string; line2: string; postalCode: string };
        };
      };
      const c = data.customer;
      setHistory(c ? { orders: c.orders, cancelled: c.cancelled } : null);
      if (!c) return;
      setAddress((a) => ({
        ...a,
        fullName: a.fullName || c.name,
        ...(c.address && !a.line1
          ? {
              district: c.address.district,
              area: c.address.area,
              line1: c.address.line1,
              line2: c.address.line2,
              postalCode: c.address.postalCode,
            }
          : {}),
      }));
      if (c.email && !email) setEmail(c.email);
    } catch {
      // lookup is a convenience only
    }
  }

  function addLine(p: Product, v: Variant | null) {
    setLines((ls) => {
      const key = `${p.id}:${v?.id ?? ""}`;
      const i = ls.findIndex((l) => `${l.productId}:${l.variantId ?? ""}` === key);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l));
      return [
        ...ls,
        {
          productId: p.id,
          variantId: v?.id ?? null,
          name: p.name,
          variantName: v?.label ?? null,
          image: p.image,
          price: v?.price ?? p.price,
          quantity: 1,
        },
      ];
    });
  }

  async function save() {
    if (!lines.length) return toast.error("Add at least one product");
    if (!normalizeBdPhone(address.phone)) return toast.error("Enter a valid mobile number (01XXXXXXXXX)");
    if (!address.district) return toast.error("Choose the district");
    setSaving(true);
    try {
      const body = {
        address,
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        shipping: shippingText.trim() === "" ? null : shipping,
        discount,
        notes,
        ...(mode === "new" ? { email, payment: { method, paid: method !== "COD" && paid, trxId }, source, sendSms } : {}),
      };
      const res = await fetch(mode === "new" ? "/api/admin/orders" : `/api/admin/orders/${orderId}/edit`, {
        method: mode === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Could not save the order");
      toast.success(mode === "new" ? "Order created" : "Order updated");
      router.push(`/admin/orders/${data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the order");
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Customer and delivery</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={address.phone}
                onChange={(e) => setA("phone", e.target.value)}
                onBlur={() => void lookupCustomer()}
              />
              {history && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" /> Returning customer · {history.orders} order
                  {history.orders === 1 ? "" : "s"}
                  {history.cancelled > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">, {history.cancelled} cancelled</span>
                  )}
                </p>
              )}
            </div>
            <div className={field}>
              <Label htmlFor="fullName">Name</Label>
              <Input id="fullName" value={address.fullName} onChange={(e) => setA("fullName", e.target.value)} />
            </div>
            {mode === "new" && (
              <div className={cn(field, "sm:col-span-2")}>
                <Label htmlFor="email">
                  E-mail <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            <div className={field}>
              <Label htmlFor="district">District</Label>
              <select id="district" className={select} value={address.district} onChange={(e) => setA("district", e.target.value)}>
                <option value="">Choose district</option>
                {BD_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <Label htmlFor="area">Area / Thana</Label>
              <Input id="area" value={address.area} onChange={(e) => setA("area", e.target.value)} />
            </div>
            <div className={cn(field, "sm:col-span-2")}>
              <Label htmlFor="line1">Full address</Label>
              <Input id="line1" placeholder="House, road, block / village" value={address.line1} onChange={(e) => setA("line1", e.target.value)} />
            </div>
            <div className={field}>
              <Label htmlFor="line2">
                Landmark <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="line2" value={address.line2} onChange={(e) => setA("line2", e.target.value)} />
            </div>
            <div className={field}>
              <Label htmlFor="postalCode">
                Postal code <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="postalCode" inputMode="numeric" value={address.postalCode} onChange={(e) => setA("postalCode", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Products</h2>
          <ProductPicker onPick={addLine} />
          {lines.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Search above and add the products the customer ordered.
            </p>
          ) : (
            <ul className="mt-4 divide-y rounded-lg border">
              {lines.map((l, i) => (
                <li key={`${l.productId}:${l.variantId ?? ""}`} className="flex items-center gap-3 p-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="line-clamp-1 font-medium">{l.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {l.variantName ? `${l.variantName} · ` : ""}
                      {formatPrice(l.price)}
                    </span>
                  </span>
                  <span className="flex items-center rounded-lg border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Fewer"
                      onClick={() =>
                        setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))
                      }
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm tabular-nums">{l.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="More"
                      onClick={() =>
                        setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: Math.min(20, x.quantity + 1) } : x)))
                      }
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </span>
                  <span className="hidden w-24 text-right text-sm font-medium tabular-nums sm:block">
                    {formatPrice(l.price * l.quantity)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${l.name}`}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {mode === "new" && (
          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="font-semibold">Payment and source</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className={field}>
                <Label htmlFor="method">Payment</Label>
                <select id="method" className={select} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={field}>
                <Label htmlFor="source">Order came from</Label>
                <select id="source" className={select} value={source} onChange={(e) => setSource(e.target.value)}>
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {method !== "COD" && (
                <>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Checkbox checked={paid} onCheckedChange={(v) => setPaid(v === true)} />
                    The customer has already paid
                  </label>
                  {paid && (
                    <div className={field}>
                      <Label htmlFor="trx">Transaction ID</Label>
                      <Input id="trx" value={trxId} onChange={(e) => setTrxId(e.target.value.toUpperCase())} />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-4 rounded-xl border bg-card p-4 sm:p-5 lg:sticky lg:top-6">
        <h2 className="font-semibold">Summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd>
              <Input
                aria-label="Delivery charge"
                inputMode="decimal"
                className="h-8 w-28 text-right"
                placeholder={String(autoShipping)}
                value={shippingText}
                onChange={(e) => setShippingText(e.target.value)}
                disabled={lockTotal}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>
              <Input
                aria-label="Discount"
                inputMode="decimal"
                className="h-8 w-28 text-right"
                placeholder="0"
                value={discountText}
                onChange={(e) => setDiscountText(e.target.value)}
                disabled={lockTotal}
              />
            </dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(total)}</dd>
          </div>
        </dl>
        {lockTotal && (
          <p className="rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200">
            Paid online: products and charges can change only if the total stays the same.
          </p>
        )}
        <div className={field}>
          <Label htmlFor="notes">Note</Label>
          <Textarea id="notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {mode === "new" && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sendSms} onCheckedChange={(v) => setSendSms(v === true)} />
            Send the order SMS to the customer
          </label>
        )}
        <Button className="w-full" size="lg" onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {mode === "new" ? "Create order" : "Save changes"}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={orderId ? `/admin/orders/${orderId}` : "/admin/orders"}>Cancel</Link>
        </Button>
      </aside>
    </div>
  );
}

function ProductPicker({ onPick }: { onPick: (p: Product, v: Variant | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { products?: Product[] };
        setResults(data.products ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const shown = useMemo(() => results.slice(0, 8), [results]);

  return (
    <div className="mt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search products by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
        {loading && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {shown.length > 0 && (
        <ul className="mt-2 max-h-72 divide-y overflow-y-auto rounded-lg border">
          {shown.map((p) => {
            const hasVariants = p.variants.length > 0;
            const out = hasVariants ? p.variants.every((v) => v.stock <= 0) : p.stock <= 0;
            return (
              <li key={p.id} className="p-2.5">
                <button
                  type="button"
                  disabled={out}
                  onClick={() => (hasVariants ? setOpenFor(openFor === p.id ? null : p.id) : onPick(p, null))}
                  className="flex w-full items-center gap-3 text-left disabled:opacity-50"
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatPrice(p.price)} ·{" "}
                      {out ? "out of stock" : hasVariants ? `${p.variants.length} options` : `${p.stock} in stock`}
                    </span>
                  </span>
                  {!out && <Plus className="size-4 text-muted-foreground" />}
                </button>
                {openFor === p.id && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-13">
                    {p.variants.map((v) => (
                      <Button
                        key={v.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={v.stock <= 0}
                        onClick={() => onPick(p, v)}
                      >
                        {v.label}
                        <span className="text-muted-foreground">({v.stock})</span>
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
