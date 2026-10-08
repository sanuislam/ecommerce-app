import "server-only";
import { prisma } from "@/lib/prisma";

export type ProfitSummary = {
  orders: number;
  revenue: number; // product sales after discounts and refunds (delivery charges excluded)
  cost: number; // cost of goods with a known cost
  costCoverage: number; // share of sold units that have a cost price (0–1)
  courier: number; // courier charges recorded
  grossProfit: number;
  netProfit: number; // after courier charges
};

/** Profit on orders delivered in the last `days` days. */
export async function profitSummary(days = 30): Promise<ProfitSummary> {
  const since = new Date(Date.now() - days * 86_400_000);
  const delivered = await prisma.orderEvent.findMany({
    where: { status: "DELIVERED", createdAt: { gte: since } },
    select: { orderId: true },
    distinct: ["orderId"],
  });
  const orders = await prisma.order.findMany({
    where: { id: { in: delivered.map((d) => d.orderId) }, status: { in: ["DELIVERED", "REFUNDED"] } },
    select: {
      subtotal: true,
      discount: true,
      refundedAmount: true,
      courierCharge: true,
      items: { select: { quantity: true, costPrice: true } },
    },
  });
  let revenue = 0;
  let cost = 0;
  let units = 0;
  let costed = 0;
  let courier = 0;
  for (const o of orders) {
    revenue += Number(o.subtotal) - Number(o.discount) - Number(o.refundedAmount);
    courier += Number(o.courierCharge ?? 0);
    for (const i of o.items) {
      units += i.quantity;
      if (i.costPrice != null) {
        costed += i.quantity;
        cost += Number(i.costPrice) * i.quantity;
      }
    }
  }
  const grossProfit = revenue - cost;
  return {
    orders: orders.length,
    revenue,
    cost,
    costCoverage: units ? costed / units : 0,
    courier,
    grossProfit,
    netProfit: grossProfit - courier,
  };
}
