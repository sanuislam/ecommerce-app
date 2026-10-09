import "server-only";
import { cache } from "react";
import { bkashConfigured } from "@/lib/bkash";
import { upayConfigured } from "@/lib/upay";
import { getOrderSettings } from "@/lib/order-settings";
import { getSiteSettings } from "@/lib/site-settings";

export type PayMethod = { id: "BKASH" | "UPAY" | "NAGAD" | "ROCKET" | "COD"; name: string; logo: string | null };

/**
 * What the shop really offers right now — payment methods that work at
 * checkout, the return window, free-delivery threshold, support hours.
 * Every promise on the storefront is built from this, never hard-coded.
 */
export const getStoreFacts = cache(async () => {
  const [bkash, upay, rules, site] = await Promise.all([
    bkashConfigured().catch(() => false),
    upayConfigured().catch(() => false),
    getOrderSettings(),
    getSiteSettings(),
  ]);
  const wallets: PayMethod[] = [
    ...(bkash ? [{ id: "BKASH" as const, name: "bKash", logo: "/payments/bkash.svg" }] : []),
    ...(upay ? [{ id: "UPAY" as const, name: "Upay", logo: "/payments/upay.svg" }] : []),
  ];
  const methods: PayMethod[] = [...wallets, { id: "COD", name: "Cash on delivery", logo: null }];
  const paymentText = [...wallets.map((w) => w.name), "cash on delivery"].join(", ").replace(/, ([^,]*)$/, " or $1");
  return {
    methods,
    wallets,
    /** "bKash, Upay or cash on delivery" */
    paymentText,
    returnsEnabled: rules.returnsEnabled,
    returnDays: rules.returnWindowDays,
    freeThreshold: site.freeShippingThreshold,
    supportHours: site.supportHours,
    supportPhone: site.supportPhone,
    tawkId: site.tawkId,
    newsletterOffer: !!site.newsletterCoupon,
    flashSaleEndsAt: site.flashSaleEndsAt,
    /** The set flash sale already ended: hide the deals. */
    flashSaleOver: !!site.flashSaleEndsAt && Date.parse(site.flashSaleEndsAt) <= Date.now(),
  };
});
export type StoreFacts = Awaited<ReturnType<typeof getStoreFacts>>;
