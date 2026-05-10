import { prisma } from "@/lib/prisma";

export type PwaSettingsValues = {
  enabled: boolean;
  appName: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  icon192Url: string;
  icon512Url: string;
  maskableIconUrl: string;
  display: string;
  orientation: string;
  startUrl: string;
};

export const DEFAULT_PWA: PwaSettingsValues = {
  enabled: true,
  appName: "Eid Bazar",
  shortName: "Eid Bazar",
  description:
    "Your trusted Eid shopping destination — curated finds, fair prices, and fast delivery across Bangladesh.",
  themeColor: "#0f172a",
  backgroundColor: "#ffffff",
  icon192Url: "",
  icon512Url: "",
  maskableIconUrl: "",
  display: "standalone",
  orientation: "portrait",
  startUrl: "/",
};

export async function getPwaSettings(): Promise<PwaSettingsValues> {
  try {
    const row = await prisma.pwaSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) return DEFAULT_PWA;
    return {
      enabled: row.enabled,
      appName: row.appName || DEFAULT_PWA.appName,
      shortName: row.shortName || DEFAULT_PWA.shortName,
      description: row.description || DEFAULT_PWA.description,
      themeColor: row.themeColor || DEFAULT_PWA.themeColor,
      backgroundColor: row.backgroundColor || DEFAULT_PWA.backgroundColor,
      icon192Url: row.icon192Url,
      icon512Url: row.icon512Url,
      maskableIconUrl: row.maskableIconUrl,
      display: row.display || DEFAULT_PWA.display,
      orientation: row.orientation || DEFAULT_PWA.orientation,
      startUrl: row.startUrl || DEFAULT_PWA.startUrl,
    };
  } catch (err) {
    console.error("getPwaSettings failed", err);
    return DEFAULT_PWA;
  }
}
