import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { getSeoSettings } from "@/lib/seo-settings";
import { getTrackingSettings } from "@/lib/tracking";
import { siteUrl } from "@/lib/site-url";
import { TrackingForm } from "@/components/admin/tracking-form";

export const dynamic = "force-dynamic";

function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {value ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      ) : (
        <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium">
          {label} {value ? <span className="font-mono text-xs text-muted-foreground">{value}</span> : null}
        </div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

export default async function TrackingPage() {
  const [seo, t] = await Promise.all([getSeoSettings(), getTrackingSettings()]);
  return (
    <div className="max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pixel &amp; analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Measure what your Facebook ads and Google bring in. With the IDs set, the shop sends: product viewed, added to
        cart, checkout started and purchase (with the order value).
      </p>

      <section className="mt-5 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Tracking IDs</h2>
          <Link href="/admin/seo" className="text-sm underline">
            Edit in SEO &amp; PWA
          </Link>
        </div>
        <div className="mt-2 divide-y">
          <Row label="Facebook Pixel" value={seo.metaPixelId} hint="ViewContent, AddToCart, InitiateCheckout, Purchase" />
          <Row label="Google Analytics 4" value={seo.ga4MeasurementId} hint="view_item, add_to_cart, begin_checkout, purchase" />
          <Row label="Google Tag Manager" value={seo.gtmContainerId} hint="The same events in the dataLayer (GA4 ecommerce format)" />
        </div>
      </section>

      <TrackingForm
        hasToken={!!t.fbCapiToken}
        tokenTail={t.fbCapiToken ? t.fbCapiToken.slice(-4) : ""}
        testCode={t.fbTestCode}
        feedEnabled={t.feedEnabled}
        feedUrl={`${siteUrl()}/feeds/products.xml`}
        pixelSet={!!seo.metaPixelId}
      />
    </div>
  );
}
