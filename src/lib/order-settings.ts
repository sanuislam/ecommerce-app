import "server-only";
import { prisma } from "@/lib/prisma";

export type OrderSettingsValues = {
  codOtpRequired: boolean;
  codMaxAmount: number | null;
  returnsEnabled: boolean;
  returnWindowDays: number;
  lowStockDefault: number;
};

export const ORDER_SETTINGS_DEFAULTS: OrderSettingsValues = {
  codOtpRequired: false,
  codMaxAmount: null,
  returnsEnabled: true,
  returnWindowDays: 7,
  lowStockDefault: 5,
};

export async function getOrderSettings(): Promise<OrderSettingsValues> {
  const row = await prisma.orderSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  if (!row) return ORDER_SETTINGS_DEFAULTS;
  return {
    codOtpRequired: row.codOtpRequired,
    codMaxAmount: row.codMaxAmount,
    returnsEnabled: row.returnsEnabled,
    returnWindowDays: row.returnWindowDays,
    lowStockDefault: row.lowStockDefault,
  };
}
