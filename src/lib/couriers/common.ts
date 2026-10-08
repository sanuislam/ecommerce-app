import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const COURIERS = ["steadfast", "pathao", "redx"] as const;
export type CourierId = (typeof COURIERS)[number];

export const COURIER_LABEL: Record<CourierId, string> = {
  steadfast: "Steadfast",
  pathao: "Pathao",
  redx: "RedX",
};

export class CourierError extends Error {
  constructor(
    message: string,
    public httpStatus = 0,
  ) {
    super(message);
  }
}

export type CourierSettingsRow = NonNullable<Awaited<ReturnType<typeof loadCourierSettings>>>;

async function loadCourierSettings() {
  return prisma.courierSettings.findUnique({ where: { id: "default" } });
}

/** The courier settings row (created on first use, with a random webhook key). */
export async function getCourierSettings() {
  const row = await loadCourierSettings().catch(() => null);
  if (row?.webhookKey) return row;
  const key = randomBytes(18).toString("base64url");
  return prisma.courierSettings.upsert({
    where: { id: "default" },
    create: { id: "default", webhookKey: key },
    update: row && !row.webhookKey ? { webhookKey: key } : {},
  });
}

export function courierReady(s: CourierSettingsRow, c: CourierId): boolean {
  switch (c) {
    case "steadfast":
      return s.steadfastEnabled && !!s.steadfastApiKey && !!s.steadfastSecretKey;
    case "pathao":
      return (
        s.pathaoEnabled &&
        !!s.pathaoClientId &&
        !!s.pathaoClientSecret &&
        !!s.pathaoUsername &&
        !!s.pathaoPassword &&
        !!s.pathaoStoreId
      );
    case "redx":
      return s.redxEnabled && !!s.redxToken;
  }
}

export async function readyCouriers(): Promise<CourierId[]> {
  const s = await getCourierSettings();
  return COURIERS.filter((c) => courierReady(s, c));
}

const TIMEOUT_MS = 20_000;

/** JSON fetch with a timeout; never follows redirects; returns status + parsed body. */
export async function courierFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<{ status: number; json: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new CourierError(`Could not reach the courier (${err instanceof Error ? err.message : "network error"})`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

/** First readable error message in a courier's error body. */
export function errorText(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const j = json as Record<string, unknown>;
  const errors = j.errors;
  if (errors && typeof errors === "object") {
    const firstMsg = Object.values(errors as Record<string, unknown>)
      .flat()
      .find((v) => typeof v === "string");
    if (typeof firstMsg === "string") return firstMsg;
  }
  for (const k of ["message", "msg", "error", "reason"]) {
    if (typeof j[k] === "string" && j[k]) return j[k] as string;
  }
  return fallback;
}

/** Lower-case letters only, with common old / new district spellings merged. */
export function placeKey(raw: string): string {
  const k = raw.toLowerCase().replace(/[^a-z]/g, "");
  const ALIAS: Record<string, string> = {
    chittagong: "chattogram",
    comilla: "cumilla",
    barisal: "barishal",
    jessore: "jashore",
    bogra: "bogura",
    coxsbazaar: "coxsbazar",
    chapainawabgonj: "chapainawabganj",
    nawabganj: "chapainawabganj",
    jhalakati: "jhalokathi",
    jhalokati: "jhalokathi",
    netrakona: "netrokona",
    maulvibazar: "moulvibazar",
    narshingdi: "narsingdi",
  };
  return ALIAS[k] ?? k;
}

/** Best match of `want` among names (exact key, then contains either way). */
export function bestMatch<T>(items: T[], name: (t: T) => string, want: string | null | undefined): T | null {
  if (!want) return null;
  const w = placeKey(want);
  if (!w) return null;
  return (
    items.find((t) => placeKey(name(t)) === w) ??
    items.find((t) => placeKey(name(t)).startsWith(w) || w.startsWith(placeKey(name(t)))) ??
    items.find((t) => placeKey(name(t)).includes(w) || w.includes(placeKey(name(t)))) ??
    null
  );
}

/** "In_Transit" / "delivery-in-progress" → "In transit" / "Delivery in progress". */
export function prettyStatus(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function trackingUrl(courier: string | null, tracking: string | null, phone?: string | null): string | null {
  if (!courier || !tracking) return null;
  const t = encodeURIComponent(tracking);
  switch (courier) {
    case "steadfast":
      return `https://steadfast.com.bd/t/${t}`;
    case "pathao":
      return `https://merchant.pathao.com/tracking?consignment_id=${t}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}`;
    case "redx":
      return `https://redx.com.bd/track-parcel/?trackingId=${t}`;
    default:
      return null;
  }
}
