import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getShippingConfig } from "@/lib/site-settings";
import { OrderEditor } from "@/components/admin/order-editor";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const shippingConfig = await getShippingConfig();
  return (
    <div className="p-4 sm:p-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New order</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        For orders taken by phone, Facebook, WhatsApp or Instagram. Stock is taken when you create it.
      </p>
      <div className="mt-6">
        <OrderEditor mode="new" shippingConfig={shippingConfig} />
      </div>
    </div>
  );
}
