import "server-only";
import { CourierError, courierFetch, errorText, type CourierSettingsRow } from "@/lib/couriers/common";

// Steadfast (Packzy) merchant API. Static Api-Key + Secret-Key headers; no sandbox.
const BASE = "https://portal.packzy.com/api/v1";

const headers = (s: CourierSettingsRow) => ({
  "Api-Key": s.steadfastApiKey,
  "Secret-Key": s.steadfastSecretKey,
});

/** Errors may come as HTTP 200 with `status` ≥ 400 in the body. */
function failed(status: number, json: unknown) {
  const inner = Number((json as { status?: unknown } | null)?.status ?? 200);
  return status >= 400 || inner >= 400;
}

export type SteadfastBooking = {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
  total_lot?: number;
};

export async function steadfastCreate(s: CourierSettingsRow, b: SteadfastBooking) {
  const { status, json } = await courierFetch(`${BASE}/create_order`, {
    method: "POST",
    headers: headers(s),
    body: b,
  });
  const c = (json as { consignment?: { consignment_id?: number; tracking_code?: string; status?: string } } | null)
    ?.consignment;
  if (failed(status, json) || !c?.consignment_id) {
    throw new CourierError(`Steadfast: ${errorText(json, `HTTP ${status}`)}`, status);
  }
  return {
    consignmentId: String(c.consignment_id),
    tracking: c.tracking_code ?? String(c.consignment_id),
    status: c.status ?? "in_review",
    charge: null as number | null,
  };
}

export async function steadfastStatus(s: CourierSettingsRow, consignmentId: string): Promise<string> {
  const { status, json } = await courierFetch(`${BASE}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
    headers: headers(s),
  });
  const ds = (json as { delivery_status?: string } | null)?.delivery_status;
  if (failed(status, json) || !ds) throw new CourierError(`Steadfast: ${errorText(json, `HTTP ${status}`)}`, status);
  return ds;
}

export async function steadfastBalance(s: CourierSettingsRow): Promise<number> {
  const { status, json } = await courierFetch(`${BASE}/get_balance`, { headers: headers(s) });
  const bal = (json as { current_balance?: number } | null)?.current_balance;
  if (failed(status, json) || bal === undefined) {
    throw new CourierError(`Steadfast: ${errorText(json, `HTTP ${status}`)}`, status);
  }
  return Number(bal);
}

/** Only a confirmed full delivery counts ("…_approval_pending" is the rider's claim). */
export const steadfastDelivered = (raw: string) => raw.toLowerCase() === "delivered";
