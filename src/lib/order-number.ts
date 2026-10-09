/** The order number customers and staff see, e.g. "EB-10042". Client-safe. */
export const ORDER_PREFIX = "EB-";
export const orderNo = (o: { number: number }) => `${ORDER_PREFIX}${o.number}`;

/** "EB-10042", "eb10042", "#10042" or "10042" → 10042, else null. */
export function parseOrderNo(raw: string): number | null {
  const m = raw.trim().match(/^#?\s*(?:eb[-\s]?)?(\d{4,9})$/i);
  return m ? Number(m[1]) : null;
}
