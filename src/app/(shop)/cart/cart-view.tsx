"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/store/cart";
import { calculateShipping, calculateTax, formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export function CartView() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Cart shows the cheaper estimate (Inside Dhaka). Final fee is selected at checkout.
  const shipping = calculateShipping(subtotal, "DHAKA");
  const tax = calculateTax(subtotal);
  const total = subtotal + shipping + tax;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>

      {mounted && items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
          <ShoppingBag className="size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Find something you love and bring it home.
          </p>
          <Button asChild className="mt-4">
            <Link href="/products">Shop now</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-4 rounded-lg border bg-card p-3"
                >
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <Link
                      href={`/products/${item.slug}`}
                      className="line-clamp-2 font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatPrice(item.price)} each
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-md border">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setQuantity(item.productId, item.quantity - 1)
                          }
                          aria-label="Decrease"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setQuantity(item.productId, item.quantity + 1)
                          }
                          aria-label="Increase"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(item.productId)}
                        aria-label="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <aside className="h-fit rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping <span className="text-xs">(estimated)</span>
                </span>
                <span>
                  {shipping === 0 ? "Free" : `from ${formatPrice(shipping)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (est.)</span>
                <span>{formatPrice(tax)}</span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Button asChild className="mt-4 w-full" size="lg">
              <Link href="/checkout">
                Checkout <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Secure checkout powered by Stripe
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
