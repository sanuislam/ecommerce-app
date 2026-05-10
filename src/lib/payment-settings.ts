import { prisma } from "@/lib/prisma";

export type PaymentSettingsValues = {
  bkashEnabled: boolean;
  bkashMode: "sandbox" | "live";
  bkashUsername: string;
  bkashPassword: string;
  bkashAppKey: string;
  bkashAppSecret: string;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsValues = {
  bkashEnabled: false,
  bkashMode: "sandbox",
  bkashUsername: "",
  bkashPassword: "",
  bkashAppKey: "",
  bkashAppSecret: "",
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
  };
}

export type PaymentSettingsClient = ReturnType<typeof sanitizeForClient>;
