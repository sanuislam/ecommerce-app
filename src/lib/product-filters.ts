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
};

export const SORTS = [
  { k: "", label: "Newest" },
  { k: "price-asc", label: "Price: low to high" },
  { k: "price-desc", label: "Price: high to low" },
  { k: "name", label: "Name A–Z" },
];

export function buildQuery(state: FilterState, patch: Partial<FilterState> = {}) {
  const next = { ...state, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}
