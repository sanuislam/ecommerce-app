export type MfsMethod = "BKASH" | "NAGAD" | "ROCKET" | "UPAY";

export const MFS_METHODS: MfsMethod[] = ["BKASH", "NAGAD", "ROCKET", "UPAY"];

export const MFS_LABELS: Record<MfsMethod, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  UPAY: "Upay",
};

export const MFS_INSTRUCTIONS: Record<MfsMethod, string> = {
  BKASH: "Open bKash app → Send Money → enter the number below → enter the order total → after sending, paste the Transaction ID (TrxID).",
  NAGAD: "Open Nagad app → Send Money → enter the number below → enter the order total → after sending, paste the Transaction ID.",
  ROCKET: "Dial *322# or open Rocket app → Send Money → enter the number below → enter the order total → after sending, paste the Transaction ID.",
  UPAY: "Open Upay app → Send Money → enter the number below → enter the order total → after sending, paste the Transaction ID.",
};

// NEXT_PUBLIC_* values must be read with literal names so Next.js can inline them.
const RECEIVING_NUMBERS: Record<MfsMethod, string> = {
  BKASH: process.env.NEXT_PUBLIC_BKASH_NUMBER ?? "",
  NAGAD: process.env.NEXT_PUBLIC_NAGAD_NUMBER ?? "",
  ROCKET: process.env.NEXT_PUBLIC_ROCKET_NUMBER ?? "",
  UPAY: process.env.NEXT_PUBLIC_UPAY_NUMBER ?? "",
};

/** The shop's personal/merchant number customers send money to. */
export function getReceivingNumber(method: MfsMethod): string {
  return RECEIVING_NUMBERS[method].trim();
}

/**
 * A manual "send money" method is only offered when its receiving number is
 * set — otherwise customers could send money to a placeholder number.
 */
export function manualMfsAvailable(method: MfsMethod): boolean {
  return getReceivingNumber(method).length >= 11;
}
