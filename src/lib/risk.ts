import "server-only";
import { prisma } from "@/lib/prisma";

export type PhoneRisk = {
  orders: number;
  delivered: number;
  /** Parcels that went out and came back (refused / returned). */
  returned: number;
  /** Cancelled before shipping. */
  cancelled: number;
  /** delivered ÷ (delivered + returned), or null with no finished parcel yet. */
  successRate: number | null;
  blocked: boolean;
};

const tailOf = (raw: string | null | undefined) => {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
};

/**
 * Delivery history of phone numbers in this shop, matched on the last ten
 * digits so 01…, +8801… and 8801… are the same number.
 */
export async function phoneRisks(phones: (string | null | undefined)[]): Promise<Map<string, PhoneRisk>> {
  const tails = [...new Set(phones.map(tailOf).filter((t): t is string => !!t))];
  const out = new Map<string, PhoneRisk>();
  if (!tails.length) return out;
  const rows = await prisma.$queryRaw<
    { tail: string; orders: bigint; delivered: bigint; returned: bigint; cancelled: bigint }[]
  >`
    SELECT right(regexp_replace(a."phone", '\\D', '', 'g'), 10) AS tail,
           count(*) AS orders,
           count(*) FILTER (WHERE o."status" = 'DELIVERED') AS delivered,
           count(*) FILTER (
             WHERE (o."status" IN ('CANCELLED', 'REFUNDED') AND (
                     o."courierConsignmentId" IS NOT NULL OR
                     EXISTS (SELECT 1 FROM "OrderEvent" e WHERE e."orderId" = o."id" AND e."status" = 'SHIPPED')))
                OR (o."status" = 'SHIPPED' AND lower(coalesce(o."courierStatus", '')) ~ '(return|^cancelled$)')
           ) AS returned,
           count(*) FILTER (
             WHERE o."status" = 'CANCELLED' AND o."courierConsignmentId" IS NULL AND
                   NOT EXISTS (SELECT 1 FROM "OrderEvent" e WHERE e."orderId" = o."id" AND e."status" = 'SHIPPED')
           ) AS cancelled
      FROM "Order" o
      JOIN "Address" a ON a."id" = o."addressId"
     WHERE a."phone" IS NOT NULL
       AND right(regexp_replace(a."phone", '\\D', '', 'g'), 10) = ANY(${tails})
     GROUP BY 1`;
  const blocked = await prisma.blockedPhone.findMany({
    where: { phone: { in: tails.map((t) => `0${t}`) } },
    select: { phone: true },
  });
  const blockedSet = new Set(blocked.map((b) => b.phone.slice(-10)));
  for (const t of tails) {
    const r = rows.find((x) => x.tail === t);
    const delivered = Number(r?.delivered ?? 0);
    const returned = Number(r?.returned ?? 0);
    out.set(t, {
      orders: Number(r?.orders ?? 0),
      delivered,
      returned,
      cancelled: Number(r?.cancelled ?? 0),
      successRate: delivered + returned > 0 ? delivered / (delivered + returned) : null,
      blocked: blockedSet.has(t),
    });
  }
  return out;
}

export async function phoneRisk(phone: string | null | undefined): Promise<PhoneRisk | null> {
  const t = tailOf(phone);
  if (!t) return null;
  return (await phoneRisks([phone])).get(t) ?? null;
}

export { tailOf as phoneTail };
