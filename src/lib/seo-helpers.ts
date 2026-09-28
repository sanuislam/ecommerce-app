/** A date ~90 days ahead (YYYY-MM-DD) for schema.org Offer.priceValidUntil. */
export function offerValidUntil(): string {
  return new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
}
