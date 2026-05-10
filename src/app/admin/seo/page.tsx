import { getSeoSettings } from "@/lib/seo-settings";
import { getPwaSettings } from "@/lib/pwa-settings";
import { SeoForm } from "@/components/admin/seo-form";
import { PwaForm } from "@/components/admin/pwa-form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const [seo, pwa] = await Promise.all([getSeoSettings(), getPwaSettings()]);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">SEO & PWA</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Search engine metadata, social cards, analytics tags, and the
        installable Progressive Web App.
      </p>
      <div className="mt-6">
        <Tabs defaultValue="seo">
          <TabsList>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="pwa">PWA</TabsTrigger>
          </TabsList>
          <TabsContent value="seo" className="mt-6">
            <SeoForm initial={seo} />
          </TabsContent>
          <TabsContent value="pwa" className="mt-6">
            <PwaForm initial={pwa} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
