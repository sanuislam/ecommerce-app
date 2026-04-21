import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY ?? "";

// Lazy-initialize so builds don't fail when keys are placeholder values.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(apiKey || "sk_test_placeholder", {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

export function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.startsWith("sk_") && !key.includes("replace_me"));
}
