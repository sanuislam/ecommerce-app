import "server-only";
import { CourierError, courierFetch, errorText, type CourierSettingsRow } from "@/lib/couriers/common";

// RedX open API. One long-lived token from the RedX panel.
const BASE = {
  sandbox: "https://sandbox.redx.com.bd/v1.0.0-beta",
  live: "https://openapi.redx.com.bd/v1.0.0-beta",
};
const api = (s: CourierSettingsRow) => (s.redxMode === "live" ? BASE.live : BASE.sandbox);
const headers = (s: CourierSettingsRow) => ({ "API-ACCESS-TOKEN": `Bearer ${s.redxToken}` });

export type RedxArea = { id: number; name: string; postCode: number | null; district: string };

export async function redxAreas(
  s: CourierSettingsRow,
  q: { district?: string; postCode?: string },
): Promise<RedxArea[]> {
  const sp = new URLSearchParams();
  if (q.postCode) sp.set("post_code", q.postCode);
  else if (q.district) sp.set("district_name", q.district);
  const { status, json } = await courierFetch(`${api(s)}/areas${sp.size ? `?${sp}` : ""}`, { headers: headers(s) });
  if (status >= 400) throw new CourierError(`RedX: ${errorText(json, `HTTP ${status}`)}`, status);
  const areas =
    (json as { areas?: { id: number; name: string; post_code?: number; division_name?: string }[] } | null)
      ?.areas ?? [];
  return areas.map((a) => ({
    id: a.id,
    name: a.name,
    postCode: a.post_code ?? null,
    district: a.division_name ?? "",
  }));
}

export async function redxStores(s: CourierSettingsRow) {
  const { status, json } = await courierFetch(`${api(s)}/pickup/stores`, { headers: headers(s) });
  if (status >= 400) throw new CourierError(`RedX: ${errorText(json, `HTTP ${status}`)}`, status);
  return (
    (json as { pickup_stores?: { id: number; name: string; address: string; area_name?: string }[] } | null)
      ?.pickup_stores ?? []
  ).map((p) => ({ id: p.id, name: p.name, address: p.address }));
}

export type RedxBooking = {
  customer_name: string;
  customer_phone: string;
  delivery_area: string;
  delivery_area_id: number;
  customer_address: string;
  merchant_invoice_id: string;
  cash_collection_amount: string;
  parcel_weight: number; // grams
  value: number;
  instruction?: string;
};

export async function redxCreate(s: CourierSettingsRow, b: RedxBooking) {
  const body = { ...b, ...(s.redxPickupStoreId ? { pickup_store_id: s.redxPickupStoreId } : {}) };
  const { status, json } = await courierFetch(`${api(s)}/parcel`, {
    method: "POST",
    headers: headers(s),
    body,
  });
  const id = (json as { tracking_id?: string } | null)?.tracking_id;
  if (status >= 400 || !id) throw new CourierError(`RedX: ${errorText(json, `HTTP ${status}`)}`, status);
  return { consignmentId: id, tracking: id, status: "pickup-pending", charge: null as number | null };
}

export async function redxStatus(s: CourierSettingsRow, trackingId: string): Promise<{ status: string; charge: number | null }> {
  const { status, json } = await courierFetch(`${api(s)}/parcel/info/${encodeURIComponent(trackingId)}`, {
    headers: headers(s),
  });
  const p = (json as { parcel?: { status?: string; charge?: number | string } } | null)?.parcel;
  if (status >= 400 || !p?.status) throw new CourierError(`RedX: ${errorText(json, `HTTP ${status}`)}`, status);
  const charge = p.charge != null && Number.isFinite(Number(p.charge)) ? Number(p.charge) : null;
  return { status: p.status, charge };
}

export const redxDelivered = (raw: string) => raw.toLowerCase() === "delivered";
