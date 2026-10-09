import { getStoreFacts } from "@/lib/store-facts";
import { PaymentLogos } from "@/components/site/payment-logos";

/** "Ways to pay" band above the footer: only methods that work at checkout. */
export async function PaymentsStrip() {
  const facts = await getStoreFacts();
  return (
    <section className="border-t bg-muted/20 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Ways to pay</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Pay {facts.paymentText}.</p>
        </div>
        <PaymentLogos methods={facts.methods} className="justify-center" />
      </div>
    </section>
  );
}
