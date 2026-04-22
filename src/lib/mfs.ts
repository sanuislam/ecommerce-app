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

export function getReceivingNumber(method: MfsMethod): string {
  switch (method) {
    case "BKASH":
      return process.env.NEXT_PUBLIC_BKASH_NUMBER || "01700000000";
    case "NAGAD":
      return process.env.NEXT_PUBLIC_NAGAD_NUMBER || "01700000000";
    case "ROCKET":
      return process.env.NEXT_PUBLIC_ROCKET_NUMBER || "01700000000-0";
    case "UPAY":
      return process.env.NEXT_PUBLIC_UPAY_NUMBER || "01700000000";
  }
}
