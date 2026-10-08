/** Mobile-banking payment methods, as stored on orders (older orders may hold any of them). */
export type MfsMethod = "BKASH" | "NAGAD" | "ROCKET" | "UPAY";

export const MFS_LABELS: Record<MfsMethod, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  UPAY: "Upay",
};
