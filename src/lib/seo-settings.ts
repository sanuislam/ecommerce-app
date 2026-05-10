import { prisma } from "@/lib/prisma";

export type SeoSettingsValues = {
  siteName: string;
  titleTemplate: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string;
  defaultOgImage: string;
  twitterHandle: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  facebookAppId: string;
  ga4MeasurementId: string;
  gtmContainerId: string;
  metaPixelId: string;
  jsonLdEnabled: boolean;
  organizationLogoUrl: string;
};

export const DEFAULT_SEO: SeoSettingsValues = {
  siteName: "Eid Bazar",
  titleTemplate: "%s | Eid Bazar",
  defaultTitle: "Eid Bazar — Modern e-commerce",
  defaultDescription:
    "Your trusted Eid shopping destination — curated finds, fair prices, and fast delivery across Bangladesh.",
  defaultKeywords: "",
  defaultOgImage: "",
  twitterHandle: "",
  googleSiteVerification: "",
  bingSiteVerification: "",
  facebookAppId: "",
  ga4MeasurementId: "",
  gtmContainerId: "",
  metaPixelId: "",
  jsonLdEnabled: true,
  organizationLogoUrl: "",
};

export async function getSeoSettings(): Promise<SeoSettingsValues> {
  try {
    const row = await prisma.seoSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) return DEFAULT_SEO;
    return {
      siteName: row.siteName || DEFAULT_SEO.siteName,
      titleTemplate: row.titleTemplate || DEFAULT_SEO.titleTemplate,
      defaultTitle: row.defaultTitle || DEFAULT_SEO.defaultTitle,
      defaultDescription:
        row.defaultDescription || DEFAULT_SEO.defaultDescription,
      defaultKeywords: row.defaultKeywords,
      defaultOgImage: row.defaultOgImage,
      twitterHandle: row.twitterHandle,
      googleSiteVerification: row.googleSiteVerification,
      bingSiteVerification: row.bingSiteVerification,
      facebookAppId: row.facebookAppId,
      ga4MeasurementId: row.ga4MeasurementId,
      gtmContainerId: row.gtmContainerId,
      metaPixelId: row.metaPixelId,
      jsonLdEnabled: row.jsonLdEnabled,
      organizationLogoUrl: row.organizationLogoUrl,
    };
  } catch (err) {
    console.error("getSeoSettings failed", err);
    return DEFAULT_SEO;
  }
}
