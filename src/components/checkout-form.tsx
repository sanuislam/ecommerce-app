"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/store/cart";
import { calculateShipping, calculateTax, formatPrice } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

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

export function CheckoutForm({
  userEmail,
  stripeEnabled,
}: {
  userEmail: string;
  stripeEnabled: boolean;
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

  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const total = subtotal + shipping + tax;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
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
      });
      if (data.checkoutUrl) {
        // Do not clear the cart yet — the user may cancel on Stripe and land
        // back on /cart. The cart is cleared on the order success page after
        // the payment is confirmed.
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

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 rounded-lg border bg-card p-5"
      >
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
          {submitting ? "Processing..." : stripeEnabled ? "Pay with Stripe" : "Place order"}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3" />
          {stripeEnabled
            ? "Secure checkout powered by Stripe"
            : "Demo mode: no payment will be charged"}
        </p>
      </aside>
    </form>
  );
}
