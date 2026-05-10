import { CheckoutForm } from "@/components/checkout-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { stripeConfigured } from "@/lib/stripe";
import { bkashConfigured } from "@/lib/bkash";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/checkout");
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutForm
        userEmail={session.user.email ?? ""}
        stripeEnabled={stripeConfigured()}
        bkashLiveEnabled={await bkashConfigured()}
      />
    </div>
  );
}
