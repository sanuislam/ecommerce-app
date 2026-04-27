import { getSiteSettingsRaw } from "@/lib/site-settings";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettingsRaw();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Site settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Social media links and contact details shown in the site footer and
        contact pages.
      </p>
      <div className="mt-6">
        <SiteSettingsForm initial={settings} />
      </div>
    </div>
  );
}
