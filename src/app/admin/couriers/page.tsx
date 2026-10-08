import { getCourierSettings } from "@/lib/couriers/common";
import { siteUrl } from "@/lib/site-url";
import { CourierSettingsForm } from "@/components/admin/courier-settings-form";

export const dynamic = "force-dynamic";

const mask = (v: string) => (v ? `••••${v.slice(-4)}` : "");

export default async function CouriersPage() {
  const s = await getCourierSettings();
  const hook = (c: string) => `${siteUrl()}/api/couriers/webhook/${c}/${s.webhookKey}`;
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Couriers</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Connect your Steadfast, Pathao and RedX merchant accounts to book parcels from an order (or many at once
        from the orders list). Booked orders are marked shipped, and a delivered parcel marks the order delivered.
      </p>
      <div className="mt-6">
        <CourierSettingsForm
          initial={{
            defaultWeightKg: Number(s.defaultWeightKg),
            steadfastEnabled: s.steadfastEnabled,
            steadfastApiKey: s.steadfastApiKey,
            steadfastSecretKey: mask(s.steadfastSecretKey),
            steadfastWebhookToken: mask(s.steadfastWebhookToken),
            pathaoEnabled: s.pathaoEnabled,
            pathaoMode: s.pathaoMode === "live" ? "live" : "sandbox",
            pathaoClientId: s.pathaoClientId,
            pathaoClientSecret: mask(s.pathaoClientSecret),
            pathaoUsername: s.pathaoUsername,
            pathaoPassword: mask(s.pathaoPassword),
            pathaoStoreId: s.pathaoStoreId,
            pathaoWebhookSecret: mask(s.pathaoWebhookSecret),
            redxEnabled: s.redxEnabled,
            redxMode: s.redxMode === "live" ? "live" : "sandbox",
            redxToken: mask(s.redxToken),
            redxPickupStoreId: s.redxPickupStoreId,
          }}
          webhooks={{ steadfast: hook("steadfast"), pathao: hook("pathao"), redx: hook("redx") }}
        />
      </div>
    </div>
  );
}
