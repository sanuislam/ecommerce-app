import "server-only";
import { prisma } from "@/lib/prisma";
import { CourierError, courierFetch, errorText, type CourierSettingsRow } from "@/lib/couriers/common";

// Pathao Courier merchant API ("Aladdin"). OAuth password grant; the token is
// kept in the settings row (it lasts days) and renewed a minute early.
const BASE = {
  sandbox: "https://courier-api-sandbox.pathao.com",
  live: "https://api-hermes.pathao.com",
};
const api = (s: CourierSettingsRow) => `${s.pathaoMode === "live" ? BASE.live : BASE.sandbox}/aladdin/api/v1`;

type TokenJson = { access_token?: string; refresh_token?: string; expires_in?: number };

async function issue(s: CourierSettingsRow, body: Record<string, string>): Promise<string> {
  const { status, json } = await courierFetch(`${api(s)}/issue-token`, {
    method: "POST",
    body: { client_id: s.pathaoClientId, client_secret: s.pathaoClientSecret, ...body },
  });
  const t = json as TokenJson | null;
  if (status >= 400 || !t?.access_token) {
    throw new CourierError(`Pathao sign-in failed: ${errorText(json, `HTTP ${status}`)}`, status);
  }
  const expiresAt = new Date(Date.now() + Math.max(60, (t.expires_in ?? 3600) - 60) * 1000);
  await prisma.courierSettings.update({
    where: { id: "default" },
    data: {
      pathaoAccessToken: t.access_token,
      pathaoRefreshToken: t.refresh_token ?? "",
      pathaoTokenExpiresAt: expiresAt,
    },
  });
  s.pathaoAccessToken = t.access_token;
  s.pathaoRefreshToken = t.refresh_token ?? "";
  s.pathaoTokenExpiresAt = expiresAt;
  return t.access_token;
}

async function token(s: CourierSettingsRow, fresh = false): Promise<string> {
  if (!fresh && s.pathaoAccessToken && s.pathaoTokenExpiresAt && s.pathaoTokenExpiresAt > new Date()) {
    return s.pathaoAccessToken;
  }
  if (s.pathaoRefreshToken && !fresh) {
    try {
      return await issue(s, { refresh_token: s.pathaoRefreshToken, grant_type: "refresh_token" });
    } catch {
      // fall through to a password sign-in
    }
  }
  return issue(s, { username: s.pathaoUsername, password: s.pathaoPassword, grant_type: "password" });
}

/** Forgets the saved token (call when credentials change). */
export async function resetPathaoToken() {
  await prisma.courierSettings.updateMany({
    where: { id: "default" },
    data: { pathaoAccessToken: "", pathaoRefreshToken: "", pathaoTokenExpiresAt: null },
  });
}

async function call(s: CourierSettingsRow, path: string, init: { method?: string; body?: unknown } = {}) {
  let r = await courierFetch(`${api(s)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token(s)}` },
  });
  if (r.status === 401) {
    r = await courierFetch(`${api(s)}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${await token(s, true)}` },
    });
  }
  return r;
}

type ListJson<T> = { data?: { data?: T[]; last_page?: number } };

export async function pathaoCities(s: CourierSettingsRow) {
  const { status, json } = await call(s, "/city-list");
  if (status >= 400) throw new CourierError(`Pathao: ${errorText(json, `HTTP ${status}`)}`, status);
  return ((json as ListJson<{ city_id: number; city_name: string }>)?.data?.data ?? []).map((c) => ({
    id: c.city_id,
    name: c.city_name,
  }));
}

export async function pathaoZones(s: CourierSettingsRow, cityId: number) {
  const { status, json } = await call(s, `/cities/${cityId}/zone-list`);
  if (status >= 400) throw new CourierError(`Pathao: ${errorText(json, `HTTP ${status}`)}`, status);
  return ((json as ListJson<{ zone_id: number; zone_name: string }>)?.data?.data ?? []).map((z) => ({
    id: z.zone_id,
    name: z.zone_name,
  }));
}

export async function pathaoAreas(s: CourierSettingsRow, zoneId: number) {
  const { status, json } = await call(s, `/zones/${zoneId}/area-list`);
  if (status >= 400) throw new CourierError(`Pathao: ${errorText(json, `HTTP ${status}`)}`, status);
  return ((json as ListJson<{ area_id: number; area_name: string }>)?.data?.data ?? []).map((a) => ({
    id: a.area_id,
    name: a.area_name,
  }));
}

export async function pathaoStores(s: CourierSettingsRow) {
  const out: { id: number; name: string; address: string }[] = [];
  for (let page = 1; page <= 10; page++) {
    const { status, json } = await call(s, `/stores?page=${page}`);
    if (status >= 400) throw new CourierError(`Pathao: ${errorText(json, `HTTP ${status}`)}`, status);
    const d = (json as ListJson<{ store_id: number; store_name: string; store_address: string }>)?.data;
    for (const st of d?.data ?? []) out.push({ id: st.store_id, name: st.store_name, address: st.store_address });
    if (!d?.last_page || page >= d.last_page) break;
  }
  return out;
}

export type PathaoBooking = {
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  amount_to_collect: number;
  item_quantity: number;
  item_weight: number;
  item_description?: string;
  special_instruction?: string;
};

export async function pathaoCreate(s: CourierSettingsRow, b: PathaoBooking) {
  if (!s.pathaoStoreId) throw new CourierError("Pathao: choose your pickup store in Couriers settings");
  const body = {
    store_id: s.pathaoStoreId,
    delivery_type: 48, // normal delivery
    item_type: 2, // parcel
    ...b,
  };
  // Never retried on a 5xx: the order may already be booked.
  const { status, json } = await call(s, "/orders", { method: "POST", body });
  const d = (json as { data?: { consignment_id?: string; order_status?: string; delivery_fee?: number } } | null)
    ?.data;
  if (status >= 400 || !d?.consignment_id) {
    throw new CourierError(`Pathao: ${errorText(json, `HTTP ${status}`)}`, status);
  }
  return {
    consignmentId: d.consignment_id,
    tracking: d.consignment_id,
    status: d.order_status ?? "Pending",
    charge: typeof d.delivery_fee === "number" ? d.delivery_fee : null,
  };
}

export async function pathaoStatus(s: CourierSettingsRow, consignmentId: string): Promise<string> {
  const { status, json } = await call(s, `/orders/${encodeURIComponent(consignmentId)}/info`);
  const d = (json as { data?: { order_status?: string } } | null)?.data;
  if (status >= 400 || !d?.order_status) throw new CourierError(`Pathao: ${errorText(json, `HTTP ${status}`)}`, status);
  return d.order_status;
}

export const pathaoDelivered = (raw: string) => raw.toLowerCase().replace(/[^a-z]/g, "") === "delivered";
