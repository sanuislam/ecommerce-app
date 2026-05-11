"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/store/cart";
import {
  calculateShipping,
  calculateTax,
  formatPrice,
  type ShippingRegion,
} from "@/lib/utils";
import { ShieldCheck, CreditCard, Banknote, Truck, Check } from "lucide-react";
import { MFS_METHODS, MFS_LABELS, MFS_INSTRUCTIONS, getReceivingNumber, type MfsMethod } from "@/lib/mfs";

type FormState = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type PaymentMethod = "STRIPE" | MfsMethod | "COD";

export function CheckoutForm({
  userEmail,
  stripeEnabled,
  bkashLiveEnabled = false,
}: {
  userEmail: string;
  stripeEnabled: boolean;
  bkashLiveEnabled?: boolean;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "BD",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    stripeEnabled ? "STRIPE" : "BKASH",
  );
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [shippingRegion, setShippingRegion] =
    useState<ShippingRegion>("DHAKA");

  const shipping = calculateShipping(subtotal, shippingRegion);
  const tax = calculateTax(subtotal);
  const total = subtotal + shipping + tax;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Manual MFS = customer pastes their TrxID (always for Nagad/Rocket/Upay,
  // also for bKash when the live gateway isn't configured).
  const isManualMfs =
    (MFS_METHODS as readonly string[]).includes(paymentMethod) &&
    !(paymentMethod === "BKASH" && bkashLiveEnabled);
  const isBkashLive = paymentMethod === "BKASH" && bkashLiveEnabled;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (isManualMfs && (!senderNumber.trim() || !trxId.trim())) {
      toast.error("Please enter your mobile number and Transaction ID");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post<{
        id: string;
        checkoutUrl?: string;
      }>("/api/checkout", {
        address: form,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        paymentMethod,
        paymentSenderNumber: senderNumber,
        paymentTransactionId: trxId,
        shippingRegion,
      });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        clear();
        router.push(`/orders/${data.id}?success=1`);
      }
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Checkout failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const MFS_LOGOS: Record<MfsMethod, string> = {
    BKASH: "/payments/bkash.png",
    NAGAD: "/payments/nagad.png",
    ROCKET: "/payments/rocket.png",
    UPAY: "/payments/upay.png",
  };

  const payOptions: {
    key: PaymentMethod;
    label: string;
    hint: string;
    icon: React.ReactNode;
    show: boolean;
  }[] = [
    {
      key: "STRIPE",
      label: "Card (Stripe)",
      hint: "Visa, Mastercard, Amex",
      icon: <CreditCard className="size-5" />,
      show: stripeEnabled,
    },
    ...MFS_METHODS.map((m) => ({
      key: m as PaymentMethod,
      label: MFS_LABELS[m],
      hint: "Mobile financial service",
      icon: (
        <Image
          src={MFS_LOGOS[m]}
          alt={`${MFS_LABELS[m]} logo`}
          width={64}
          height={32}
          className="h-7 w-auto object-contain"
        />
      ),
      show: true,
    })),
    {
      key: "COD",
      label: "Cash on Delivery",
      hint: "Pay when you receive",
      icon: <Truck className="size-5" />,
      show: true,
    },
  ];

  const ctaLabel =
    paymentMethod === "STRIPE" && stripeEnabled
      ? "Pay with Stripe"
      : paymentMethod === "COD"
        ? "Place order (COD)"
        : isBkashLive
          ? "Pay with bKash"
          : isManualMfs
            ? `Submit ${MFS_LABELS[paymentMethod as MfsMethod]} payment`
            : "Place order";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="space-y-5 rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold">Contact & shipping</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={userEmail} readOnly />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                required
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line1">Address</Label>
              <Input
                id="line1"
                required
                value={form.line1}
                onChange={(e) => set("line1", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line2">Apt, suite, etc.</Label>
              <Input
                id="line2"
                value={form.line2}
                onChange={(e) => set("line2", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                required
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">State / region</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal code</Label>
              <Input
                id="postalCode"
                required
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Shipping zone</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {([
                  { key: "DHAKA", label: "Inside Dhaka", fee: 80 },
                  { key: "OUTSIDE_DHAKA", label: "Outside Dhaka", fee: 120 },
                ] as const).map((opt) => {
                  const selected = shippingRegion === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setShippingRegion(opt.key)}
                      aria-pressed={selected}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-all ${
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "hover:border-foreground/30"
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground">
                        {formatPrice(opt.fee)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Free shipping on orders over {formatPrice(1000)}.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold">Payment method</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {payOptions
              .filter((o) => o.show)
              .map((o) => {
                const selected = paymentMethod === o.key;
                const isMfsOption = (MFS_METHODS as readonly string[]).includes(
                  o.key,
                );
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setPaymentMethod(o.key)}
                    aria-pressed={selected}
                    className={`relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                      selected
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                        : "hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isMfsOption ? (
                        <span className="flex h-9 w-16 items-center justify-center rounded-md border bg-white px-1.5 shadow-sm">
                          {o.icon}
                        </span>
                      ) : (
                        <span
                          className={`flex size-8 items-center justify-center rounded-md ${
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {o.icon}
                        </span>
                      )}
                      <span className="text-sm font-medium">{o.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{o.hint}</span>
                    {selected && (
                      <Check className="absolute right-2 top-2 size-4 text-primary" />
                    )}
                  </button>
                );
              })}
          </div>

          {isBkashLive && (
            <div className="rounded-lg border border-dashed bg-pink-50 p-4 text-sm dark:bg-pink-950/30">
              <div className="flex items-center gap-2 font-medium text-pink-700 dark:text-pink-300">
                <Banknote className="size-4" /> bKash Tokenized Checkout
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You’ll be redirected to the secure bKash page to enter your
                wallet number and PIN. Your order is automatically marked paid
                once the transaction completes.
              </p>
            </div>
          )}

          {isManualMfs && (
            <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {MFS_LABELS[paymentMethod as MfsMethod]} receiving number
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-3 py-1.5 text-base font-semibold tracking-wide text-primary">
                    {getReceivingNumber(paymentMethod as MfsMethod)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Send {formatPrice(total)} to this number
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {MFS_INSTRUCTIONS[paymentMethod as MfsMethod]}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="senderNumber">Your {MFS_LABELS[paymentMethod as MfsMethod]} number</Label>
                  <Input
                    id="senderNumber"
                    required
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="trxId">Transaction ID</Label>
                  <Input
                    id="trxId"
                    required
                    placeholder="e.g. 9F7A2B1C3D"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your order will be marked <span className="font-medium">pending</span> until our
                team verifies the transaction (usually within 30 minutes).
              </p>
            </div>
          )}

          {paymentMethod === "COD" && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              Pay the courier in cash on delivery. Please keep the exact amount ready.
            </div>
          )}
        </div>
      </motion.div>

      <aside className="h-fit rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <div className="mt-4 space-y-3 text-sm">
          {items.map((i) => (
            <div key={i.productId} className="flex justify-between gap-2">
              <span className="line-clamp-1">
                {i.name}
                <span className="text-muted-foreground"> × {i.quantity}</span>
              </span>
              <span>{formatPrice(i.price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <Button
          type="submit"
          size="lg"
          className="mt-4 w-full"
          disabled={submitting || items.length === 0}
        >
          {submitting ? "Processing..." : ctaLabel}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3" />
          {paymentMethod === "STRIPE" && stripeEnabled
            ? "Secure checkout powered by Stripe"
            : isBkashLive
              ? "Secure checkout powered by bKash"
              : isManualMfs
                ? "Manual verification — no money moves until we confirm"
                : paymentMethod === "COD"
                  ? "No online payment — pay courier on delivery"
                  : "Demo mode: no payment will be charged"}
        </p>
      </aside>
    </form>
  );
}
