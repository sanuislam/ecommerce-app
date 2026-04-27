import "server-only";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG } from "@/lib/site-config";

export type SiteSettingsView = {
  facebookUrl: string;
  whatsappUrl: string;
  instagramUrl: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
};

export const SETTINGS_DEFAULTS: SiteSettingsView = {
  facebookUrl: SITE_CONFIG.facebookUrl,
  whatsappUrl: SITE_CONFIG.whatsappUrl,
  instagramUrl: "",
  supportEmail: SITE_CONFIG.supportEmail,
  supportPhone: SITE_CONFIG.phone,
  address: SITE_CONFIG.address,
};

function merge(row: Partial<SiteSettingsView> | null): SiteSettingsView {
  if (!row) return SETTINGS_DEFAULTS;
  return {
    facebookUrl: row.facebookUrl?.trim() || SETTINGS_DEFAULTS.facebookUrl,
    whatsappUrl: row.whatsappUrl?.trim() || SETTINGS_DEFAULTS.whatsappUrl,
    instagramUrl: row.instagramUrl?.trim() || SETTINGS_DEFAULTS.instagramUrl,
    supportEmail: row.supportEmail?.trim() || SETTINGS_DEFAULTS.supportEmail,
    supportPhone: row.supportPhone?.trim() || SETTINGS_DEFAULTS.supportPhone,
    address: row.address?.trim() || SETTINGS_DEFAULTS.address,
  };
}

export async function getSiteSettings(): Promise<SiteSettingsView> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    return merge(row);
  } catch (err) {
    console.error("getSiteSettings failed", err);
    return SETTINGS_DEFAULTS;
  }
}

export async function getSiteSettingsRaw(): Promise<SiteSettingsView> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) return { ...SETTINGS_DEFAULTS, instagramUrl: "" };
    return {
      facebookUrl: row.facebookUrl ?? "",
      whatsappUrl: row.whatsappUrl ?? "",
      instagramUrl: row.instagramUrl ?? "",
      supportEmail: row.supportEmail ?? "",
      supportPhone: row.supportPhone ?? "",
      address: row.address ?? "",
    };
  } catch (err) {
    console.error("getSiteSettingsRaw failed", err);
    return { ...SETTINGS_DEFAULTS, instagramUrl: "" };
  }
}
