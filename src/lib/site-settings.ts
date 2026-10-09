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
  /** "Every day 10 am – 10 pm"; empty = not shown. */
  supportHours: string;
  /** Tawk.to "propertyId/widgetId"; empty = no chat widget. */
  tawkId: string;
  /** Coupon code new newsletter subscribers get; empty = no offer. */
  newsletterCoupon: string;
  /** ISO time the flash sale ends; null = no countdown. */
  flashSaleEndsAt: string | null;
  /** Usual delivery days, e.g. "1–2". */
  deliveryDaysDhaka: string;
  deliveryDaysOutside: string;
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
  supportHours: "",
  tawkId: "",
  newsletterCoupon: "",
  flashSaleEndsAt: null,
  deliveryDaysDhaka: "1–2",
  deliveryDaysOutside: "2–4",
};

type Row = Partial<Omit<SiteSettingsView, "flashSaleEndsAt">> & { flashSaleEndsAt?: Date | string | null };

function storefrontFrom(row: Row | null) {
  const end = row?.flashSaleEndsAt;
  return {
    supportHours: row?.supportHours?.trim() ?? "",
    tawkId: row?.tawkId?.trim() ?? "",
    newsletterCoupon: row?.newsletterCoupon?.trim() ?? "",
    flashSaleEndsAt: end ? new Date(end).toISOString() : null,
    deliveryDaysDhaka: row?.deliveryDaysDhaka?.trim() ?? "1–2",
    deliveryDaysOutside: row?.deliveryDaysOutside?.trim() ?? "2–4",
  };
}

const intOr = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;

function shippingFrom(row: Row | null) {
  return {
    shippingInsideDhaka: intOr(row?.shippingInsideDhaka, SETTINGS_DEFAULTS.shippingInsideDhaka),
    shippingOutsideDhaka: intOr(row?.shippingOutsideDhaka, SETTINGS_DEFAULTS.shippingOutsideDhaka),
    freeShippingThreshold: intOr(row?.freeShippingThreshold, SETTINGS_DEFAULTS.freeShippingThreshold),
  };
}

function merge(row: Row | null): SiteSettingsView {
  if (!row) return SETTINGS_DEFAULTS;
  return {
    facebookUrl: row.facebookUrl?.trim() || SETTINGS_DEFAULTS.facebookUrl,
    whatsappUrl: row.whatsappUrl?.trim() || SETTINGS_DEFAULTS.whatsappUrl,
    instagramUrl: row.instagramUrl?.trim() || SETTINGS_DEFAULTS.instagramUrl,
    supportEmail: row.supportEmail?.trim() || SETTINGS_DEFAULTS.supportEmail,
    supportPhone: row.supportPhone?.trim() || SETTINGS_DEFAULTS.supportPhone,
    address: row.address?.trim() || SETTINGS_DEFAULTS.address,
    ...shippingFrom(row),
    ...storefrontFrom(row),
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
      ...storefrontFrom(row),
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
