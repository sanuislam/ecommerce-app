import "server-only";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG } from "@/lib/site-config";
import { DEFAULT_SHIPPING, type ShippingConfig } from "@/lib/pricing";

export type SiteSettingsView = {
  facebookUrl: string;
  whatsappUrl: string;
  instagramUrl: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  /** Delivery charge (৳) inside Dhaka. */
  shippingInsideDhaka: number;
  /** Delivery charge (৳) outside Dhaka. */
  shippingOutsideDhaka: number;
  /** Subtotal (৳) at or above which shipping is free; 0 = never free. */
  freeShippingThreshold: number;
};

export const SETTINGS_DEFAULTS: SiteSettingsView = {
  facebookUrl: SITE_CONFIG.facebookUrl,
  whatsappUrl: SITE_CONFIG.whatsappUrl,
  instagramUrl: "",
  supportEmail: SITE_CONFIG.supportEmail,
  supportPhone: SITE_CONFIG.phone,
  address: SITE_CONFIG.address,
  shippingInsideDhaka: DEFAULT_SHIPPING.insideDhaka,
  shippingOutsideDhaka: DEFAULT_SHIPPING.outsideDhaka,
  freeShippingThreshold: DEFAULT_SHIPPING.freeThreshold,
};

const intOr = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;

function shippingFrom(row: Partial<SiteSettingsView> | null) {
  return {
    shippingInsideDhaka: intOr(row?.shippingInsideDhaka, SETTINGS_DEFAULTS.shippingInsideDhaka),
    shippingOutsideDhaka: intOr(row?.shippingOutsideDhaka, SETTINGS_DEFAULTS.shippingOutsideDhaka),
    freeShippingThreshold: intOr(row?.freeShippingThreshold, SETTINGS_DEFAULTS.freeShippingThreshold),
  };
}

function merge(row: Partial<SiteSettingsView> | null): SiteSettingsView {
  if (!row) return SETTINGS_DEFAULTS;
  return {
    facebookUrl: row.facebookUrl?.trim() || SETTINGS_DEFAULTS.facebookUrl,
    whatsappUrl: row.whatsappUrl?.trim() || SETTINGS_DEFAULTS.whatsappUrl,
    instagramUrl: row.instagramUrl?.trim() || SETTINGS_DEFAULTS.instagramUrl,
    supportEmail: row.supportEmail?.trim() || SETTINGS_DEFAULTS.supportEmail,
    supportPhone: row.supportPhone?.trim() || SETTINGS_DEFAULTS.supportPhone,
    address: row.address?.trim() || SETTINGS_DEFAULTS.address,
    ...shippingFrom(row),
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
      ...shippingFrom(row),
    };
  } catch (err) {
    console.error("getSiteSettingsRaw failed", err);
    return { ...SETTINGS_DEFAULTS, instagramUrl: "" };
  }
}

/** Delivery charges in the shape used by `shippingFee()` in lib/pricing. */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const s = await getSiteSettings();
  return {
    insideDhaka: s.shippingInsideDhaka,
    outsideDhaka: s.shippingOutsideDhaka,
    freeThreshold: s.freeShippingThreshold,
  };
}
