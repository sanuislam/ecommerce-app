/** Query-string helpers for the product listing (safe on server and client). */

export type FilterState = {
  q?: string;
  category?: string;
  featured?: string;
  sale?: string;
  instock?: string;
  min?: string;
  max?: string;
  sort?: string;
  /** A product tag used as a collection. */
  tag?: string;
  /** Comma-separated option values, e.g. "M,L". */
  size?: string;
  color?: string;
};

/** "M,L" → ["M","L"] (trimmed, max 12, each ≤ 30 chars). */
export const listOf = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((x) => x.slice(0, 30));

export const SORTS = [
  { k: "", label: "Newest" },
  { k: "best", label: "Best selling" },
  { k: "reviews", label: "Most reviewed" },
  { k: "price-asc", label: "Price: low to high" },
  { k: "price-desc", label: "Price: high to low" },
  { k: "name", label: "Name A–Z" },
];

export function buildQuery(state: FilterState, patch: Partial<FilterState> = {}) {
  const next = { ...state, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
  // A plain category view uses its clean URL; everything else is /products.
  if (next.category) {
    params.delete("category");
    const rest = params.toString();
    return rest ? `/category/${next.category}?${rest}` : `/category/${next.category}`;
  }
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}
