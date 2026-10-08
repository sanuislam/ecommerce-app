import { prisma } from "@/lib/prisma";

export type PaymentSettingsValues = {
  bkashEnabled: boolean;
  bkashMode: "sandbox" | "live";
  bkashUsername: string;
  bkashPassword: string;
  bkashAppKey: string;
  bkashAppSecret: string;
  upayEnabled: boolean;
  upayBaseUrl: string;
  upayMerchantId: string;
  upayMerchantKey: string;
  upayMerchantName: string;
  upayMerchantCode: string;
  upayMerchantCity: string;
  upayMerchantMobile: string;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsValues = {
  bkashEnabled: false,
  bkashMode: "sandbox",
  bkashUsername: "",
  bkashPassword: "",
  bkashAppKey: "",
  bkashAppSecret: "",
  upayEnabled: false,
  upayBaseUrl: "https://uat-pg.upay.systems",
  upayMerchantId: "",
  upayMerchantKey: "",
  upayMerchantName: "",
  upayMerchantCode: "",
  upayMerchantCity: "Dhaka",
  upayMerchantMobile: "",
};

export async function getPaymentSettings(): Promise<PaymentSettingsValues> {
  try {
    const row = await prisma.paymentSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) return DEFAULT_PAYMENT_SETTINGS;
    return {
      bkashEnabled: row.bkashEnabled,
      bkashMode: row.bkashMode === "live" ? "live" : "sandbox",
      bkashUsername: row.bkashUsername,
      bkashPassword: row.bkashPassword,
      bkashAppKey: row.bkashAppKey,
      bkashAppSecret: row.bkashAppSecret,
      upayEnabled: row.upayEnabled,
      upayBaseUrl: row.upayBaseUrl,
      upayMerchantId: row.upayMerchantId,
      upayMerchantKey: row.upayMerchantKey,
      upayMerchantName: row.upayMerchantName,
      upayMerchantCode: row.upayMerchantCode,
      upayMerchantCity: row.upayMerchantCity,
      upayMerchantMobile: row.upayMerchantMobile,
    };
  } catch (err) {
    console.error("getPaymentSettings failed", err);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

/** Mask sensitive fields for client transport. Keeps last 4 chars only. */
export function sanitizeForClient(v: PaymentSettingsValues) {
  const mask = (s: string) =>
    s ? `••••••••${s.slice(-4)}` : "";
  return {
    bkashEnabled: v.bkashEnabled,
    bkashMode: v.bkashMode,
    bkashUsername: v.bkashUsername,
    bkashPasswordMasked: mask(v.bkashPassword),
    bkashAppKey: v.bkashAppKey,
    bkashAppSecretMasked: mask(v.bkashAppSecret),
    hasPassword: Boolean(v.bkashPassword),
    hasAppSecret: Boolean(v.bkashAppSecret),
    upayEnabled: v.upayEnabled,
    upayBaseUrl: v.upayBaseUrl,
    upayMerchantId: v.upayMerchantId,
    upayMerchantKeyMasked: mask(v.upayMerchantKey),
    hasUpayMerchantKey: Boolean(v.upayMerchantKey),
    upayMerchantName: v.upayMerchantName,
    upayMerchantCode: v.upayMerchantCode,
    upayMerchantCity: v.upayMerchantCity,
    upayMerchantMobile: v.upayMerchantMobile,
  };
}

export type PaymentSettingsClient = ReturnType<typeof sanitizeForClient>;
