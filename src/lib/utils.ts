import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY = "BDT";
export const CURRENCY_SYMBOL = "৳";

export function formatPrice(
  price: number | string,
  opts: { notation?: Intl.NumberFormatOptions["notation"] } = {},
) {
  const { notation = "standard" } = opts;
  const amount = typeof price === "string" ? parseFloat(price) : price;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation,
  }).format(amount);
  return `${CURRENCY_SYMBOL}${formatted}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

export function formatDate(input: string | number | Date) {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const FREE_SHIPPING_THRESHOLD = 1000;
export const SHIPPING_FEE_DHAKA = 80;
export const SHIPPING_FEE_OUTSIDE = 120;
export const TAX_RATE = 0.08;

export type ShippingRegion = "DHAKA" | "OUTSIDE_DHAKA";

export function calculateShipping(
  subtotal: number,
  region: ShippingRegion = "OUTSIDE_DHAKA",
) {
  if (subtotal <= 0) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return region === "DHAKA" ? SHIPPING_FEE_DHAKA : SHIPPING_FEE_OUTSIDE;
}

export function calculateTax(subtotal: number) {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}
