"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Minus, Plus, Zap } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/wishlist-button";
import { MAX_QTY_PER_LINE, useCart } from "@/store/cart";
import { track } from "@/lib/track";
import { strikePrice, unitPrice, variantLabel, type PricedProduct } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";

export type PurchaseVariant = {
  id: string;
  size: string;
  color: string;
  price: number | null;
  stock: number;
};

export type PurchaseProduct = PricedProduct & {
  id: string;
  name: string;
  slug: string;
  image?: string;
  stock: number;
};

const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];

/**
 * Price, option picker, quantity and the buy buttons for a product page.
 * Also renders a sticky bottom bar on phones so "Add to cart" is always
 * reachable.
 */
export function AddToCart({
  product,
  variants = [],
  whatsappUrl,
  productUrl,
}: {
  product: PurchaseProduct;
  variants?: PurchaseVariant[];
  whatsappUrl?: string;
  productUrl?: string;
}) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const hasVariants = variants.length > 0;

  const sizes = useMemo(() => uniq(variants.map((v) => v.size)), [variants]);
  const colors = useMemo(() => uniq(variants.map((v) => v.color)), [variants]);

  // Pre-select when there is only one choice on an axis.
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [color, setColor] = useState(colors.length === 1 ? colors[0] : "");
  const [quantity, setQuantity] = useState(1);

  const variant = hasVariants
    ? variants.find(
        (v) => v.size === (sizes.length ? size : "") && v.color === (colors.length ? color : ""),
      ) ?? null
    : null;

  const stock = hasVariants ? (variant?.stock ?? 0) : product.stock;
  const needsChoice = hasVariants && !variant;
  const soldOut = hasVariants ? !needsChoice && stock <= 0 : product.stock <= 0;
  const maxQty = Math.max(1, Math.min(stock, MAX_QTY_PER_LINE));
  const qty = Math.min(quantity, maxQty);

  const price = unitPrice(product, variant);
  const strike = strikePrice(product, variant);
  const optionPrices = variants.map((v) => unitPrice(product, v));
  // "from ৳X" only makes sense when options are priced differently.
  const fromPrice =
    hasVariants && !variant && new Set(optionPrices).size > 1
      ? Math.min(...optionPrices)
      : null;

  // Product page seen (Pixel ViewContent / GA4 view_item), once per product.
  useEffect(() => {
    track("ViewContent", [{ id: product.id, name: product.name, price: unitPrice(product), quantity: 1 }]);
  }, [product]);

  const optionInStock = (s: string, c: string) =>
    variants.some(
      (v) =>
        (s === "" || v.size === s) && (c === "" || v.color === c) && v.stock > 0,
    );

  function addToCart(): boolean {
    if (needsChoice) {
      toast.error(
        `Please choose ${[sizes.length && !size && "a size", colors.length && !color && "a colour"]
          .filter(Boolean)
          .join(" and ")}`,
      );
      document.getElementById("product-options")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    if (soldOut) {
      toast.error("Out of stock");
      return false;
    }
    add({
      productId: product.id,
      variantId: variant?.id ?? null,
      variantName: variant ? variantLabel(variant) : null,
      name: product.name,
      slug: product.slug,
      price,
      image: product.image,
      quantity: qty,
      stock,
    });
    track("AddToCart", [
      { id: product.id, name: product.name, price, quantity: qty, variant: variant ? variantLabel(variant) : null },
    ]);
    return true;
  }

  const handleAdd = () => {
    if (addToCart()) toast.success(`${product.name} added to cart`);
  };
  const handleBuyNow = () => {
    if (addToCart()) router.push("/checkout");
  };

  const whatsappHref = (() => {
    if (!whatsappUrl) return null;
    try {
      const url = new URL(whatsappUrl);
      const option = variant ? ` (${variantLabel(variant)})` : "";
      url.searchParams.set(
        "text",
        `Hi, I'd like to order: ${product.name}${option} × ${qty}\n${productUrl ?? ""}`.trim(),
      );
      return url.toString();
    } catch {
      return null;
    }
  })();

  const priceBlock = (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-2xl font-semibold sm:text-3xl">
        {fromPrice != null && <span className="mr-1 text-base font-normal text-muted-foreground">from</span>}
        {formatPrice(fromPrice ?? price)}
      </span>
      {strike != null && fromPrice == null && (
        <span className="text-base text-muted-foreground line-through sm:text-lg">
          {formatPrice(strike)}
        </span>
      )}
      {needsChoice ? null : soldOut ? (
        <Badge variant="destructive">Out of stock</Badge>
      ) : stock <= 5 ? (
        <Badge variant="secondary" className="text-amber-700 dark:text-amber-300">
          Only {stock} left
        </Badge>
      ) : (
        <Badge variant="secondary">In stock</Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {priceBlock}

      {hasVariants && (
        <div id="product-options" className="space-y-4">
          {sizes.length > 0 && (
            <OptionGroup
              label="Size"
              value={size}
              options={sizes}
              onChange={setSize}
              isAvailable={(s) => optionInStock(s, color)}
            />
          )}
          {colors.length > 0 && (
            <OptionGroup
              label="Colour"
              value={color}
              options={colors}
              onChange={setColor}
              isAvailable={(c) => optionInStock(size, c)}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity(Math.max(1, qty - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center text-sm font-medium tabular-nums" aria-live="polite">
            {qty}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity(Math.min(maxQty, qty + 1))}
            disabled={qty >= maxQty || soldOut}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <WishlistButton productId={product.id} withLabel />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={handleAdd} size="lg" variant="outline" disabled={soldOut}>
          <ShoppingCart className="size-4" />
          Add to cart
        </Button>
        <Button onClick={handleBuyNow} size="lg" disabled={soldOut}>
          <Zap className="size-4" />
          Buy now
        </Button>
        {whatsappHref && (
          <Button
            asChild
            size="lg"
            className="bg-[#25D366] text-white hover:bg-[#1ebe5b] sm:col-span-2"
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp className="size-4" />
              Order on WhatsApp
            </a>
          </Button>
        )}
      </div>

      {/* Sticky buy bar for phones / small tablets */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-muted-foreground">
              {variant ? variantLabel(variant) : needsChoice ? "Choose an option" : product.name}
            </div>
            <div className="font-semibold">{formatPrice(fromPrice ?? price)}</div>
          </div>
          <Button variant="outline" size="icon-lg" onClick={handleAdd} disabled={soldOut} aria-label="Add to cart">
            <ShoppingCart className="size-5" />
          </Button>
          <Button size="lg" className="px-5" onClick={handleBuyNow} disabled={soldOut}>
            {soldOut ? "Sold out" : "Buy now"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onChange,
  isAvailable,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  isAvailable: (v: string) => boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        {label}
        {value && <span className="ml-2 font-normal text-muted-foreground">{value}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = o === value;
          const available = isAvailable(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? "" : o)}
              className={cn(
                "min-h-10 min-w-12 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-foreground/40",
                !available && !selected && "text-muted-foreground line-through decoration-1 opacity-60",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
