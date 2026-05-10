import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { getSeoSettings } from "@/lib/seo-settings";
import { getPwaSettings } from "@/lib/pwa-settings";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  const ogImages = seo.defaultOgImage ? [{ url: seo.defaultOgImage }] : [];
  const other: Record<string, string> = {};
  if (seo.facebookAppId) other["fb:app_id"] = seo.facebookAppId;

  return {
    metadataBase: new URL("https://eidbazar.com"),
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate,
    },
    description: seo.defaultDescription,
    keywords: seo.defaultKeywords
      ? seo.defaultKeywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    applicationName: seo.siteName,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: seo.siteName,
      url: "https://eidbazar.com",
      locale: "en_BD",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      site: seo.twitterHandle || undefined,
      creator: seo.twitterHandle || undefined,
      images: ogImages.map((i) => i.url),
    },
    verification: {
      google: seo.googleSiteVerification || undefined,
      other: seo.bingSiteVerification
        ? { "msvalidate.01": seo.bingSiteVerification }
        : undefined,
    },
    other: Object.keys(other).length > 0 ? other : undefined,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const pwa = await getPwaSettings();
  return {
    themeColor: pwa.themeColor,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [seo, pwa] = await Promise.all([getSeoSettings(), getPwaSettings()]);
  const orgJsonLd = seo.jsonLdEnabled
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: seo.siteName,
        url: "https://eidbazar.com",
        logo:
          seo.organizationLogoUrl ||
          seo.defaultOgImage ||
          undefined,
      }
    : null;
  const websiteJsonLd = seo.jsonLdEnabled
    ? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: seo.siteName,
        url: "https://eidbazar.com",
        potentialAction: {
          "@type": "SearchAction",
          target:
            "https://eidbazar.com/products?search={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      }
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {seo.gtmContainerId && (
          <Script id="gtm-head" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${seo.gtmContainerId}');`}
          </Script>
        )}
        {seo.ga4MeasurementId && (
          <>
            <Script
              id="ga4-loader"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${seo.ga4MeasurementId}`}
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.ga4MeasurementId}');`}
            </Script>
          </>
        )}
        {seo.metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.metaPixelId}');fbq('track','PageView');`}
          </Script>
        )}
        {orgJsonLd && (
          <Script id="ld-org" type="application/ld+json">
            {JSON.stringify(orgJsonLd)}
          </Script>
        )}
        {websiteJsonLd && (
          <Script id="ld-website" type="application/ld+json">
            {JSON.stringify(websiteJsonLd)}
          </Script>
        )}
        <PwaRegister enabled={pwa.enabled} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
