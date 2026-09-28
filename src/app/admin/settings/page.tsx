import { getSiteSettingsRaw } from "@/lib/site-settings";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettingsRaw();
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Site settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Contact details and social links shown in the site footer, plus the
        delivery charges used at checkout.
      </p>
      <div className="mt-6">
        <SiteSettingsForm initial={settings} />
      </div>
    </div>
  );
}
