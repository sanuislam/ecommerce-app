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
export const FLAT_SHIPPING_FEE = 60;
export const TAX_RATE = 0.08;

export function calculateShipping(subtotal: number) {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}

export function calculateTax(subtotal: number) {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}
