"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/store/cart";
import { useQuote } from "@/hooks/use-quote";
import { BD_DISTRICTS, normalizeBdPhone } from "@/lib/districts";
import { cn, formatPrice } from "@/lib/utils";
import {
  ShieldCheck,
  CreditCard,
  Banknote,
  Truck,
  Check,
  MapPin,
  Plus,
  Tag,
  X,
} from "lucide-react";

type FormState = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  isDefault: boolean;
};

type PaymentMethod = "STRIPE" | "BKASH" | "UPAY" | "COD";

const LOGOS = {
  BKASH: "/payments/bkash.png",
  NAGAD: "/payments/nagad.png",
  UPAY: "/payments/upay.png",
};

const noop = () => () => {};

export function CheckoutForm({
  userEmail,
  defaultName,
  defaultPhone,
  savedAddresses,
  stripeEnabled,
  bkashLiveEnabled = false,
  upayLiveEnabled = false,
}: {
  userEmail: string;
  defaultName: string;
  defaultPhone: string;
  savedAddresses: SavedAddress[];
  stripeEnabled: boolean;
  bkashLiveEnabled?: boolean;
  upayLiveEnabled?: boolean;
}) {
  const router = useRouter();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);

  const [addressId, setAddressId] = useState<string | "new">(
    savedAddresses[0]?.id ?? "new",
  );
  const [form, setForm] = useState<FormState>({
    fullName: defaultName,
    phone: defaultPhone,
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [saveAsDefault, setSaveAsDefault] = useState(savedAddresses.length === 0);

  const payOptions: { key: PaymentMethod; label: string; hint: string; logos?: string[] }[] = [
    // Upay's merchant gateway: the customer pays from bKash, Nagad or Upay.
    ...(upayLiveEnabled
      ? [{
          key: "UPAY" as const,
          label: "Mobile banking",
          hint: "bKash, Nagad or Upay",
          logos: [LOGOS.BKASH, LOGOS.NAGAD, LOGOS.UPAY],
        }]
      : []),
    ...(bkashLiveEnabled
      ? [{ key: "BKASH" as const, label: "bKash", hint: "Pay instantly with bKash", logos: [LOGOS.BKASH] }]
      : []),
    { key: "COD", label: "Cash on Delivery", hint: "Pay when you receive" },
    ...(stripeEnabled
      ? [{ key: "STRIPE" as const, label: "Card", hint: "Visa, Mastercard, Amex" }]
      : []),
  ];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(payOptions[0].key);
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const selectedSaved = savedAddresses.find((a) => a.id === addressId);
  const district = selectedSaved?.state || form.state;
  const { quote, loading: quoting } = useQuote(mounted ? items : [], district, couponCode);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const isBkashLive = paymentMethod === "BKASH" && bkashLiveEnabled;
  const isUpayLive = paymentMethod === "UPAY" && upayLiveEnabled;
  const total = quote?.total ?? 0;

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponCode(code);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (addressId === "new") {
      if (!form.state) {
        toast.error("Please choose your district");
        return;
      }
      if (!normalizeBdPhone(form.phone)) {
        toast.error("Enter a valid mobile number (01XXXXXXXXX)");
        document.getElementById("phone")?.focus();
        return;
      }
    }
    if (quote?.errors.length) {
      toast.error(quote.errors[0]);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(addressId === "new" ? { address: form, saveAsDefault } : { addressId }),
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? null,
            quantity: i.quantity,
          })),
          paymentMethod,
          couponCode,
          notes,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Checkout failed");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      clear();
      router.push(`/orders/${data.id}?success=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  const ctaLabel =
    paymentMethod === "STRIPE"
      ? "Pay with card"
      : paymentMethod === "COD"
        ? "Place order"
        : isBkashLive
          ? "Pay with bKash"
          : isUpayLive
            ? "Pay now"
            : "Place order";

  if (mounted && items.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[1fr_380px] lg:gap-8"
    >
      <div className="min-w-0 space-y-6">
        {/* ---------------- Delivery ---------------- */}
        <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Delivery address</h2>

          {savedAddresses.length > 0 && (
            <div className="grid gap-2" role="radiogroup" aria-label="Saved addresses">
              {savedAddresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={addressId === a.id}
                  onClick={() => setAddressId(a.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                    addressId === a.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "hover:border-foreground/30",
                  )}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="font-medium">{a.fullName}</span>
                    <span className="text-muted-foreground"> · {a.phone}</span>
                    {a.isDefault && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Default</span>
                    )}
                    <span className="block break-words text-muted-foreground">
                      {[a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={addressId === "new"}
                onClick={() => setAddressId("new")}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-dashed p-3 text-left text-sm font-medium",
                  addressId === "new" ? "border-primary bg-primary/5" : "hover:border-foreground/30",
                )}
              >
                <Plus className="size-4" /> Use a new address
              </button>
            </div>
          )}

          {addressId === "new" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  required
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Mobile number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Select value={form.state} onValueChange={(v) => set("state", v)}>
                  <SelectTrigger id="district" className="w-full">
                    <SelectValue placeholder="Choose district" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {BD_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">Area / Thana</Label>
                <Input
                  id="city"
                  required
                  autoComplete="address-level2"
                  placeholder="e.g. Dhanmondi"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal code (optional)</Label>
                <Input
                  id="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line1">Full address</Label>
                <Input
                  id="line1"
                  required
                  autoComplete="street-address"
                  placeholder="House, road, block / village"
                  value={form.line1}
                  onChange={(e) => set("line1", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line2">Landmark (optional)</Label>
                <Input
                  id="line2"
                  value={form.line2}
                  onChange={(e) => set("line2", e.target.value)}
                />
              </div>
              {savedAddresses.length > 0 && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox
                    checked={saveAsDefault}
                    onCheckedChange={(v) => setSaveAsDefault(v === true)}
                  />
                  Make this my default address
                </label>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Order updates go to <span className="font-medium">{userEmail}</span>.
          </p>
        </section>

        {/* ---------------- Payment ---------------- */}
        <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Payment method</h2>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
            {payOptions.map((o) => {
              const selected = paymentMethod === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPaymentMethod(o.key)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                    // Several logos need the full row.
                    (o.logos?.length ?? 0) > 1 && "sm:col-span-2",
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "hover:border-foreground/30",
                  )}
                >
                  {o.logos ? (
                    <span className="flex shrink-0 gap-1">
                      {o.logos.map((src) => (
                        <span
                          key={src}
                          className="flex h-9 w-12 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-1 sm:w-14"
                        >
                          <Image src={src} alt="" width={56} height={28} className="h-6 w-auto object-contain" />
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {o.key === "COD" ? <Truck className="size-5" /> : <CreditCard className="size-5" />}
                    </span>
                  )}
                  <span className="min-w-0 pr-5">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </span>
                  {selected && <Check className="absolute top-2 right-2 size-4 text-primary" />}
                </button>
              );
            })}
          </div>

          {isBkashLive && (
            <div className="rounded-lg border border-dashed bg-pink-50 p-4 text-sm dark:bg-pink-950/30">
              <div className="flex items-center gap-2 font-medium text-pink-700 dark:text-pink-300">
                <Banknote className="size-4" /> bKash checkout
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You’ll be taken to the secure bKash page to enter your wallet number, OTP and PIN.
                Your order is confirmed automatically once the payment completes.
              </p>
            </div>
          )}

          {isUpayLive && (
            <div className="rounded-lg border border-dashed bg-sky-50 p-4 text-sm dark:bg-sky-950/30">
              <div className="flex items-center gap-2 font-medium text-sky-700 dark:text-sky-300">
                <Banknote className="size-4" /> Pay with bKash, Nagad or Upay
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You’ll be taken to the secure Upay payment page, where you can pay from your
                bKash, Nagad or Upay account.
                Your order is confirmed automatically once the payment completes.
              </p>
            </div>
          )}

          {paymentMethod === "COD" && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              Pay the delivery person in cash when your order arrives.
            </div>
          )}

          <div>
            <Label htmlFor="notes">Order note (optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              maxLength={500}
              placeholder="Anything we should know about delivery?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>
      </div>

      {/* ---------------- Summary ---------------- */}
      <aside className="h-fit space-y-4 rounded-lg border bg-card p-4 sm:p-5 lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="space-y-3 text-sm">
          {mounted &&
            items.map((i) => (
              <li key={`${i.productId}:${i.variantId ?? ""}`} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="line-clamp-2">{i.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {i.variantName ? `${i.variantName} · ` : ""}× {i.quantity}
                  </span>
                </span>
                <span className="shrink-0">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
        </ul>

        <div>
          <Label htmlFor="coupon" className="sr-only">Coupon code</Label>
          {quote?.coupon ? (
            <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <span className="flex items-center gap-2">
                <Tag className="size-4" /> {quote.coupon.code} applied
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove coupon"
                onClick={() => {
                  setCouponCode("");
                  setCouponInput("");
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="coupon"
                placeholder="Coupon code"
                autoCapitalize="characters"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={applyCoupon} disabled={!couponInput.trim()}>
                Apply
              </Button>
            </div>
          )}
          {couponCode && quote?.couponError && (
            <p className="mt-1 text-xs text-destructive">{quote.couponError}</p>
          )}
        </div>

        <Separator />
        <div className={cn("space-y-1.5 text-sm", quoting && "opacity-60")}>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{quote ? formatPrice(quote.subtotal) : "—"}</span>
          </div>
          {quote && quote.discount > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>Discount</span>
              <span>−{formatPrice(quote.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Delivery
              {district && (
                <span className="text-xs"> ({quote?.zone === "DHAKA" ? "inside Dhaka" : "outside Dhaka"})</span>
              )}
            </span>
            <span>
              {!district ? "Choose district" : !quote ? "—" : quote.shipping === 0 ? "Free" : formatPrice(quote.shipping)}
            </span>
          </div>
        </div>
        <Separator />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{quote ? formatPrice(total) : "—"}</span>
        </div>
        {quote?.errors.length ? (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {quote.errors[0]}.{" "}
            <Link href="/cart" className="underline">
              Update cart
            </Link>
          </div>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || !mounted || items.length === 0 || !quote || quote.errors.length > 0}
        >
          {submitting ? "Placing order..." : `${ctaLabel}${quote ? ` · ${formatPrice(total)}` : ""}`}
        </Button>
        <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Prices include VAT. By ordering you agree to our{" "}
          <Link href="/terms" className="underline">terms</Link>.
        </p>
      </aside>
    </form>
  );
}
