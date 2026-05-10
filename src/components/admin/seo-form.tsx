"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SingleImageInput } from "@/components/admin/single-image-input";
import type { SeoSettingsValues } from "@/lib/seo-settings";

export function SeoForm({ initial }: { initial: SeoSettingsValues }) {
  const router = useRouter();
  const [v, setV] = useState<SeoSettingsValues>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof SeoSettingsValues>(
    key: K,
    val: SeoSettingsValues[K],
  ) {
    setV((s) => ({ ...s, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      toast.success("SEO settings saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const previewTitle = v.defaultTitle;
  const previewDesc = v.defaultDescription;

  return (
    <form onSubmit={onSubmit} className="grid gap-6 sm:max-w-3xl">
      {/* Live SERP preview */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Google search preview
        </p>
        <div className="mt-2">
          <div className="text-xs text-emerald-700">
            https://eidbazar.com
          </div>
          <div className="text-lg text-blue-700">{previewTitle}</div>
          <div className="text-sm text-muted-foreground line-clamp-2">
            {previewDesc}
          </div>
        </div>
      </div>

      <section className="grid gap-4">
        <h3 className="text-sm font-semibold">Site identity</h3>
        <Field label="Site name">
          <Input
            value={v.siteName}
            onChange={(e) => set("siteName", e.target.value)}
          />
        </Field>
        <Field
          label="Default title"
          hint="Used as the homepage title and the fallback for pages without their own title."
        >
          <Input
            value={v.defaultTitle}
            onChange={(e) => set("defaultTitle", e.target.value)}
          />
        </Field>
        <Field
          label="Title template"
          hint="%s is replaced with the page-specific title (e.g. '%s | Eid Bazar')."
        >
          <Input
            value={v.titleTemplate}
            onChange={(e) => set("titleTemplate", e.target.value)}
          />
        </Field>
        <Field label="Default description" hint="50–160 characters.">
          <Textarea
            value={v.defaultDescription}
            onChange={(e) => set("defaultDescription", e.target.value)}
            rows={3}
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {v.defaultDescription.length}/320
          </p>
        </Field>
        <Field
          label="Default keywords"
          hint="Comma-separated. Less impact today, still indexed by Bing/Yandex."
        >
          <Input
            value={v.defaultKeywords}
            onChange={(e) => set("defaultKeywords", e.target.value)}
            placeholder="eid bazar, bangladesh, online shopping, eid 2026"
          />
        </Field>
      </section>

      <section className="grid gap-4">
        <h3 className="text-sm font-semibold">Social / Open Graph</h3>
        <Field
          label="Default OG image"
          hint="1200×630px recommended. Shown when your site is shared on Facebook, WhatsApp, Twitter, LinkedIn."
        >
          <SingleImageInput
            value={v.defaultOgImage}
            onChange={(val) => set("defaultOgImage", val)}
            folder="eidbazar/seo"
          />
        </Field>
        <Field
          label="Organization logo"
          hint="Used by Google search results structured data. Square PNG/SVG."
        >
          <SingleImageInput
            value={v.organizationLogoUrl}
            onChange={(val) => set("organizationLogoUrl", val)}
            folder="eidbazar/seo"
          />
        </Field>
        <Field label="Twitter / X handle" hint="With or without @, e.g. @eidbazar.">
          <Input
            value={v.twitterHandle}
            onChange={(e) => set("twitterHandle", e.target.value)}
            placeholder="@eidbazar"
          />
        </Field>
        <Field label="Facebook App ID">
          <Input
            value={v.facebookAppId}
            onChange={(e) => set("facebookAppId", e.target.value)}
          />
        </Field>
      </section>

      <section className="grid gap-4">
        <h3 className="text-sm font-semibold">Verification & analytics</h3>
        <Field
          label="Google Search Console (meta value only)"
          hint="Paste the content value from the 'HTML tag' verification method."
        >
          <Input
            value={v.googleSiteVerification}
            onChange={(e) => set("googleSiteVerification", e.target.value)}
            placeholder="abcDEF123…"
          />
        </Field>
        <Field label="Bing Webmaster (msvalidate.01)">
          <Input
            value={v.bingSiteVerification}
            onChange={(e) => set("bingSiteVerification", e.target.value)}
          />
        </Field>
        <Field label="Google Analytics 4 measurement ID">
          <Input
            value={v.ga4MeasurementId}
            onChange={(e) => set("ga4MeasurementId", e.target.value)}
            placeholder="G-XXXXXXXXXX"
          />
        </Field>
        <Field label="Google Tag Manager container ID">
          <Input
            value={v.gtmContainerId}
            onChange={(e) => set("gtmContainerId", e.target.value)}
            placeholder="GTM-XXXXXX"
          />
        </Field>
        <Field label="Meta (Facebook) Pixel ID">
          <Input
            value={v.metaPixelId}
            onChange={(e) => set("metaPixelId", e.target.value)}
            placeholder="1234567890"
          />
        </Field>
      </section>

      <section className="grid gap-3">
        <h3 className="text-sm font-semibold">Structured data</h3>
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div>
            <Label className="text-sm font-medium">
              JSON-LD on all pages
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Organization + WebSite on home, Product on product pages,
              BreadcrumbList sitewide. Recommended on.
            </p>
          </div>
          <Switch
            checked={v.jsonLdEnabled}
            onCheckedChange={(b) => set("jsonLdEnabled", b)}
          />
        </div>
      </section>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
