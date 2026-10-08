import { getPaymentSettings, sanitizeForClient } from "@/lib/payment-settings";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { UpaySettingsForm } from "@/components/admin/upay-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const raw = await getPaymentSettings();
  const initial = sanitizeForClient(raw);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure the bKash and Upay payment gateways. When a gateway is
        enabled, customers are redirected to it to pay; on return the order is
        automatically marked PAID.
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
      <div className="mt-10 border-t pt-6">
        <h2 className="text-lg font-semibold">Upay merchant gateway</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Merchant credentials from Upay (API v4.1.0). Used server-side only; the
          merchant key is never sent back to the browser.
        </p>
        <div className="mt-4">
          <UpaySettingsForm initial={initial} />
        </div>
      </div>
    </div>
  );
}
