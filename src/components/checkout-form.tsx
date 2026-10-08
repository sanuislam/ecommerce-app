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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Check,
  Loader2,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  Smartphone,
  Tag,
  Truck,
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

/** A wallet in the "Mobile banking" picker. */
export type Wallet = "BKASH" | "NAGAD" | "ROCKET" | "UPAY";

// Vector logos from react-bangla-pay-icons (MIT), saved in /public/payments.
const WALLETS: { id: Wallet; name: string; logo: string; ratio: string }[] = [
  { id: "BKASH", name: "bKash", logo: "/payments/bkash.svg", ratio: "h-9" },
  { id: "NAGAD", name: "Nagad", logo: "/payments/nagad.svg", ratio: "h-14" },
  { id: "ROCKET", name: "Rocket", logo: "/payments/rocket.svg", ratio: "h-10" },
  { id: "UPAY", name: "Upay", logo: "/payments/upay.svg", ratio: "h-12" },
];

type Choice = "MOBILE" | "COD";

const noop = () => () => {};

export function CheckoutForm({
  userEmail,
  defaultName,
  defaultPhone,
  savedAddresses,
  wallets,
  codMax = null,
}: {
  userEmail: string;
  defaultName: string;
  defaultPhone: string;
  savedAddresses: SavedAddress[];
  /** Which wallets can be paid with right now (their gateway is set up). */
  wallets: Record<Wallet, boolean>;
  /** Largest total allowed with cash on delivery (null = no limit). */
  codMax?: number | null;
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

  const mobileAvailable = WALLETS.some((w) => wallets[w.id]);
  const [choice, setChoice] = useState<Choice>(mobileAvailable ? "MOBILE" : "COD");
  const [pickerOpen, setPickerOpen] = useState(false);
  // Cash on delivery: the shop may ask for an SMS code first.
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(
    WALLETS.find((w) => wallets[w.id])?.id ?? null,
  );

  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const selectedSaved = savedAddresses.find((a) => a.id === addressId);
  const district = selectedSaved?.state || form.state;
  const { quote, loading: quoting } = useQuote(mounted ? items : [], district, couponCode);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const total = quote?.total ?? 0;
  const walletName = WALLETS.find((w) => w.id === wallet)?.name;

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponCode(code);
  }

  /** Checks the form; true when the order can be placed. */
  function validate(): boolean {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return false;
    }
    if (addressId === "new") {
      if (!form.fullName.trim() || !form.line1.trim() || !form.city.trim()) {
        toast.error("Please complete your delivery address");
        return false;
      }
      if (!form.state) {
        toast.error("Please choose your district");
        return false;
      }
      if (!normalizeBdPhone(form.phone)) {
        toast.error("Enter a valid mobile number (01XXXXXXXXX)");
        document.getElementById("phone")?.focus();
        return false;
      }
    }
    if (quote?.errors.length) {
      toast.error(quote.errors[0]);
      return false;
    }
    return true;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !validate()) return;
    if (choice === "MOBILE") setPickerOpen(true);
    else void placeOrder("COD");
  }

  async function sendCode(phone: string) {
    setOtpSending(true);
    try {
      const res = await fetch("/api/checkout/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send the code");
      toast.success(`Code sent to ${phone}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setOtpSending(false);
    }
  }

  async function placeOrder(paymentMethod: "COD" | "BKASH" | "UPAY", code?: string) {
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
          ...(code ? { otp: code } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        checkoutUrl?: string;
        error?: string;
        otpRequired?: boolean;
        phone?: string;
      };
      if (data.otpRequired && data.phone) {
        // First time: open the code box and send the code; a wrong code keeps it open.
        if (!otpOpen) {
          setOtpPhone(data.phone);
          setOtp("");
          setOtpOpen(true);
          void sendCode(data.phone);
        } else {
          toast.error(data.error ?? "That code didn't work");
        }
        setSubmitting(false);
        return;
      }
      if (!res.ok || !data.id) throw new Error(data.error ?? "Could not place the order");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      clear();
      router.push(`/orders/${data.id}?success=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place the order");
      setSubmitting(false);
    }
  }

  function continueWithWallet() {
    // Each wallet opens its own checkout. Nagad and Rocket have no gateway yet
    // (they show as "Coming soon").
    if (wallet === "BKASH" && wallets.BKASH) void placeOrder("BKASH");
    else if (wallet === "UPAY" && wallets.UPAY) void placeOrder("UPAY");
  }

  if (mounted && items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const canPay = mounted && items.length > 0 && !!quote && quote.errors.length === 0;
  const ctaLabel = choice === "MOBILE" ? "Pay now" : "Place order";

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="mt-6 grid items-start gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10"
      >
        <div className="min-w-0 space-y-6">
          {/* ---------------- Delivery ---------------- */}
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <StepHeading step={1} title="Delivery address" hint={`Updates go to ${userEmail}`} />

            {savedAddresses.length > 0 && (
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
                {savedAddresses.map((a) => {
                  const on = addressId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setAddressId(a.id)}
                      className={cn(
                        "relative flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        on ? "border-foreground bg-muted/40" : "hover:border-foreground/30",
                      )}
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 pr-5">
                        <span className="block font-medium">
                          {a.fullName}
                          {a.isDefault && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="block text-muted-foreground tabular-nums">{a.phone}</span>
                        <span className="mt-1 block break-words text-muted-foreground">
                          {[a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ")}
                        </span>
                      </span>
                      {on && <RadioDot />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={addressId === "new"}
                  onClick={() => setAddressId("new")}
                  className={cn(
                    "flex min-h-16 items-center justify-center gap-2 rounded-xl border border-dashed p-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    addressId === "new"
                      ? "border-foreground bg-muted/40"
                      : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  <Plus className="size-4" /> New address
                </button>
              </div>
            )}

            {addressId === "new" && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field id="fullName" label="Full name" className="sm:col-span-2">
                  <Input
                    id="fullName"
                    required
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                  />
                </Field>
                <Field id="phone" label="Mobile number">
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
                </Field>
                <Field id="district" label="District">
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
                </Field>
                <Field id="city" label="Area / Thana">
                  <Input
                    id="city"
                    required
                    autoComplete="address-level2"
                    placeholder="e.g. Dhanmondi"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
                <Field id="postalCode" label="Postal code" optional>
                  <Input
                    id="postalCode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.postalCode}
                    onChange={(e) => set("postalCode", e.target.value)}
                  />
                </Field>
                <Field id="line1" label="Full address" className="sm:col-span-2">
                  <Input
                    id="line1"
                    required
                    autoComplete="street-address"
                    placeholder="House, road, block / village"
                    value={form.line1}
                    onChange={(e) => set("line1", e.target.value)}
                  />
                </Field>
                <Field id="line2" label="Landmark" optional className="sm:col-span-2">
                  <Input
                    id="line2"
                    placeholder="Near a mosque, school, market…"
                    value={form.line2}
                    onChange={(e) => set("line2", e.target.value)}
                  />
                </Field>
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
          </section>

          {/* ---------------- Payment ---------------- */}
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <StepHeading step={2} title="Payment" hint="All payments are confirmed automatically" />

            <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Payment method">
              <PayOption
                checked={choice === "MOBILE"}
                disabled={!mobileAvailable}
                onSelect={() => setChoice("MOBILE")}
                icon={<Smartphone className="size-5" />}
                title="Mobile banking"
                text={
                  mobileAvailable
                    ? "Choose your wallet in the next step"
                    : "Not available right now"
                }
              >
                <div className="mt-3 grid max-w-sm grid-cols-4 gap-2">
                  {WALLETS.map((w) => (
                    <LogoChip key={w.id} wallet={w} />
                  ))}
                </div>
              </PayOption>

              <PayOption
                checked={choice === "COD"}
                onSelect={() => setChoice("COD")}
                icon={<Truck className="size-5" />}
                title="Cash on delivery"
                text={
                  codMax != null
                    ? `Pay in cash when your order arrives · orders up to ৳${codMax.toLocaleString("en-IN")}`
                    : "Pay the delivery person in cash when your order arrives"
                }
              />
            </div>

            <div className="mt-5">
              {showNotes || notes ? (
                <Field id="notes" label="Note for delivery" optional>
                  <Textarea
                    id="notes"
                    rows={2}
                    maxLength={500}
                    autoFocus={showNotes && !notes}
                    placeholder="e.g. Call before coming, gate code…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Field>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <Plus className="size-3.5" /> Add a note for delivery
                </button>
              )}
            </div>
          </section>
        </div>

        {/* ---------------- Summary ---------------- */}
        <aside className="rounded-2xl border bg-card p-4 sm:p-6 lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold tracking-tight">Your order</h2>
          <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {mounted &&
              items.map((i) => (
                <li key={`${i.productId}:${i.variantId ?? ""}`} className="flex gap-3 text-sm">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    {i.image && (
                      <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />
                    )}
                    <span className="absolute -top-0 -right-0 rounded-bl-md bg-foreground px-1.5 text-[11px] font-medium text-background tabular-nums">
                      {i.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 leading-snug">{i.name}</span>
                    {i.variantName && (
                      <span className="text-xs text-muted-foreground">{i.variantName}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatPrice(i.price * i.quantity)}
                  </span>
                </li>
              ))}
          </ul>

          <div className="mt-5">
            <Label htmlFor="coupon" className="sr-only">Coupon code</Label>
            {quote?.coupon ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
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

          <dl className={cn("mt-5 space-y-2 border-t pt-4 text-sm", quoting && "opacity-60")}>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{quote ? formatPrice(quote.subtotal) : "—"}</dd>
            </div>
            {quote && quote.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <dt>Discount</dt>
                <dd className="tabular-nums">−{formatPrice(quote.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Delivery
                {district && quote && (
                  <span className="text-xs">
                    {" "}({quote.zone === "DHAKA" ? "inside Dhaka" : "outside Dhaka"})
                  </span>
                )}
              </dt>
              <dd className="tabular-nums">
                {!district
                  ? "Choose district"
                  : !quote
                    ? "—"
                    : quote.shipping === 0
                      ? "Free"
                      : formatPrice(quote.shipping)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t pt-4">
            <span className="font-medium">Total</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {quote ? formatPrice(total) : "—"}
            </span>
          </div>
          <p className="text-right text-xs text-muted-foreground">VAT included</p>

          {quote?.errors.length ? (
            <div className="mt-3 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
              {quote.errors[0]}.{" "}
              <Link href="/cart" className="underline">
                Update cart
              </Link>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-4 h-12 w-full rounded-xl text-base"
            disabled={submitting || !canPay}
          >
            {submitting && !pickerOpen ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Placing order…
              </>
            ) : (
              <>
                {choice === "MOBILE" && <Lock className="size-4" />}
                {ctaLabel}
                {quote ? ` · ${formatPrice(total)}` : ""}
              </>
            )}
          </Button>
          <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="mt-px size-3.5 shrink-0" />
            <span>
              By placing the order you agree to our{" "}
              <Link href="/terms" className="underline">terms</Link>.
            </span>
          </p>
        </aside>
      </form>

      {/* ---------------- Wallet picker ---------------- */}
      <Dialog open={pickerOpen} onOpenChange={(o) => !submitting && setPickerOpen(o)}>
        <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={!submitting}>
          <DialogHeader className="border-b px-5 pt-5 pb-4 text-left">
            <DialogTitle className="text-lg">Choose your wallet</DialogTitle>
            <DialogDescription>
              {`Pay ${quote ? formatPrice(total) : "the total"} on the wallet's own secure page.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 p-5" role="radiogroup" aria-label="Wallet">
            {WALLETS.map((w) => {
              const available = wallets[w.id];
              const on = wallet === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={available ? w.name : `${w.name}, coming soon`}
                  disabled={!available || submitting}
                  onClick={() => setWallet(w.id)}
                  className={cn(
                    "relative flex h-32 flex-col items-center justify-center gap-3 rounded-xl border-2 bg-white p-3 transition-[border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    on && available
                      ? "border-foreground shadow-[0_0_0_4px] shadow-foreground/10"
                      : "border-border",
                    available ? "hover:border-foreground/40" : "cursor-not-allowed",
                  )}
                >
                  <span className={cn("flex h-14 items-center", !available && "opacity-40 grayscale")}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- crisp SVG logos */}
                    <img src={w.logo} alt="" className={cn("w-auto object-contain", w.ratio)} />
                  </span>
                  <span className="text-center text-xs leading-tight">
                    <span className={cn("block font-medium", available ? "text-neutral-800" : "text-neutral-500")}>
                      {w.name}
                    </span>
                    {!available && <span className="block text-neutral-400">Coming soon</span>}
                  </span>
                  {on && available && (
                    <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <DialogFooter className="mx-0 mb-0 flex-col gap-2 rounded-b-xl border-t bg-muted/40 px-5 py-4 sm:flex-col">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-xl text-base"
              disabled={!wallet || !wallets[wallet] || submitting}
              onClick={continueWithWallet}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Opening {walletName}…
                </>
              ) : walletName && wallet && wallets[wallet] ? (
                `Continue to ${walletName}`
              ) : (
                "Choose a wallet"
              )}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" /> We never see your PIN or OTP
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ---------------- Cash on delivery code ---------------- */}
      <Dialog open={otpOpen} onOpenChange={(o) => !submitting && setOtpOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Confirm your phone</DialogTitle>
            <DialogDescription>
              We sent a 6-digit code to <span className="font-medium text-foreground">{otpPhone}</span>. Enter it to
              place your cash on delivery order.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (otp.length === 6) void placeOrder("COD", otp);
            }}
            className="grid gap-3"
          >
            <Input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              className="h-12 text-center text-xl tracking-[0.4em] tabular-nums"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              aria-label="Code"
            />
            <Button type="submit" size="lg" className="h-11 rounded-xl" disabled={otp.length !== 6 || submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />} Confirm and place order
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
              disabled={otpSending}
              onClick={() => void sendCode(otpPhone)}
            >
              {otpSending ? "Sending…" : "Send a new code"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StepHeading({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background tabular-nums">
        {step}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg leading-7 font-semibold tracking-tight">{title}</h2>
        {hint && <p className="truncate text-sm text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
    </div>
  );
}

function RadioDot() {
  return (
    <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

function PayOption({
  checked,
  disabled,
  onSelect,
  icon,
  title,
  text,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-foreground bg-muted/40" : "hover:border-foreground/30",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-foreground" : "border-muted-foreground/40",
        )}
        aria-hidden
      >
        {checked && <span className="size-2.5 rounded-full bg-foreground" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-medium">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
        {children}
      </span>
    </button>
  );
}

function LogoChip({ wallet }: { wallet: (typeof WALLETS)[number] }) {
  return (
    <span className="flex h-11 items-center justify-center rounded-lg border bg-white px-1.5 shadow-xs sm:h-12 sm:px-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- crisp SVG logos */}
      <img
        src={wallet.logo}
        alt={wallet.name}
        className={cn(
          "w-auto max-w-full object-contain",
          wallet.id === "BKASH" ? "h-5 sm:h-6" : wallet.id === "ROCKET" ? "h-7 sm:h-8" : "h-8 sm:h-9",
        )}
      />
    </span>
  );
}
