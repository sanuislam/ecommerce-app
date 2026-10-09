/**
 * Shop events for the Facebook Pixel, Google Analytics 4 (gtag) and Google
 * Tag Manager (dataLayer). Each tool is used only when its script is on the
 * page (IDs in Admin → SEO & PWA). Client-side; never throws.
 */
type Item = { id: string; name: string; price: number; quantity: number; variant?: string | null };
type Event = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA4: Record<Event, string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

export function track(event: Event, items: Item[], opts: { orderId?: string; value?: number; shipping?: number } = {}) {
  if (typeof window === "undefined" || !items.length) return;
  const value = opts.value ?? Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  try {
    window.fbq?.(
      "track",
      event,
      {
        currency: "BDT",
        value,
        content_type: "product",
        content_ids: items.map((i) => i.id),
        contents: items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.price })),
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        ...(opts.orderId ? { order_id: opts.orderId } : {}),
      },
      // Same id as the server's Conversions API event, so Facebook counts it once.
      opts.orderId ? { eventID: opts.orderId } : undefined,
    );
  } catch {}
  const ecommerce = {
    currency: "BDT",
    value,
    ...(opts.orderId ? { transaction_id: opts.orderId } : {}),
    ...(opts.shipping != null ? { shipping: opts.shipping } : {}),
    items: items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity,
      ...(i.variant ? { item_variant: i.variant } : {}),
    })),
  };
  try {
    window.gtag?.("event", GA4[event], ecommerce);
  } catch {}
  try {
    if (window.dataLayer && !window.gtag) {
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({ event: GA4[event], ecommerce });
    }
  } catch {}
}
