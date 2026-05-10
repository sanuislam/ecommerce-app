import { getPaymentSettings, sanitizeForClient } from "@/lib/payment-settings";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const raw = await getPaymentSettings();
  const initial = sanitizeForClient(raw);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure bKash Tokenized Checkout credentials. When the live gateway
        is enabled and reachable, customers are redirected to bKash to pay; on
        return the order is automatically marked PAID.
      </p>
      <div className="mt-6">
        <h2 className="text-lg font-semibold">bKash Tokenized Checkout</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Credentials are stored encrypted in transit and used server-side only.
          They never appear in client bundles.
        </p>
        <div className="mt-4">
          <PaymentSettingsForm initial={initial} />
        </div>
      </div>
    </div>
  );
}
