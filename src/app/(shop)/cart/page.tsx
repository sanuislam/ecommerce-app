import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Your cart",
  description:
    "Review the items in your Eid Bazar cart before checkout. Inside Dhaka ৳80, outside Dhaka ৳120, free shipping over ৳1,000.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartView />;
}
