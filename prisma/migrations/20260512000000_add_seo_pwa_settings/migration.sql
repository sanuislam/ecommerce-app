-- CreateTable
CREATE TABLE "SeoSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'Eid Bazar',
    "titleTemplate" TEXT NOT NULL DEFAULT '%s | Eid Bazar',
    "defaultTitle" TEXT NOT NULL DEFAULT 'Eid Bazar — Modern e-commerce',
    "defaultDescription" TEXT NOT NULL DEFAULT 'Your trusted Eid shopping destination — curated finds, fair prices, and fast delivery across Bangladesh.',
    "defaultKeywords" TEXT NOT NULL DEFAULT '',
    "defaultOgImage" TEXT NOT NULL DEFAULT '',
    "twitterHandle" TEXT NOT NULL DEFAULT '',
    "googleSiteVerification" TEXT NOT NULL DEFAULT '',
    "bingSiteVerification" TEXT NOT NULL DEFAULT '',
    "facebookAppId" TEXT NOT NULL DEFAULT '',
    "ga4MeasurementId" TEXT NOT NULL DEFAULT '',
    "gtmContainerId" TEXT NOT NULL DEFAULT '',
    "metaPixelId" TEXT NOT NULL DEFAULT '',
    "jsonLdEnabled" BOOLEAN NOT NULL DEFAULT true,
    "organizationLogoUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeoSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PwaSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "appName" TEXT NOT NULL DEFAULT 'Eid Bazar',
    "shortName" TEXT NOT NULL DEFAULT 'Eid Bazar',
    "description" TEXT NOT NULL DEFAULT 'Your trusted Eid shopping destination — curated finds, fair prices, and fast delivery across Bangladesh.',
    "themeColor" TEXT NOT NULL DEFAULT '#0f172a',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "icon192Url" TEXT NOT NULL DEFAULT '',
    "icon512Url" TEXT NOT NULL DEFAULT '',
    "maskableIconUrl" TEXT NOT NULL DEFAULT '',
    "display" TEXT NOT NULL DEFAULT 'standalone',
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "startUrl" TEXT NOT NULL DEFAULT '/',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PwaSettings_pkey" PRIMARY KEY ("id")
);
