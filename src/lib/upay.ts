/**
 * Upay merchant payment gateway client (Upay API doc for merchant v4.1.0).
 *
 *   1. POST <base>/payment/merchant-auth/            {merchant_id, merchant_key} → token
 *   2. POST <base>/payment/merchant-payment-init/     → gateway_url (redirect the customer)
 *   3. Upay sends the customer back to redirect_url with status + invoice_id
 *      appended. That query string is NEVER trusted: the result is always read
 *      back with
 *   4. GET  <base>/payment/single-payment-status/<txn_id>/
 *   5. POST <base>/payment/bulk/refund/              [{txn_id, refund_amount}]
 *
 * Every call after auth sends `Authorization: UPAY <token>`.
 * UAT base URL: https://uat-pg.upay.systems — the live URL comes from Upay
 * with the live credentials and is saved in Admin → Payments.
 *
 * Credentials live in the PaymentSettings row (admin-managed), server-side only.
 */

import { prisma } from "@/lib/prisma";

export const UPAY_UAT_BASE = "https://uat-pg.upay.systems";

export type UpayConfig = {
  enabled: boolean;
  baseUrl: string;
  merchantId: string;
  merchantKey: string;
  merchantName: string;
  merchantCode: string;
  merchantCity: string;
  merchantMobile: string;
};

export class UpayError extends Error {
  constructor(
    message: string,
    /** Upay's error code, e.g. MNF4002 (merchant not found), PNF4012 (payment not found). */
    public code: string | null = null,
    public httpStatus = 0,
  ) {
    super(message);
  }
}

/** Base URL without a trailing slash; only https (http only for localhost tests). */
export function normalizeUpayBase(raw: string): string | null {
  const v = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return null;
    if (u.search || u.hash) return null;
    return v;
  } catch {
    return null;
  }
}

async function resolveConfig(): Promise<UpayConfig> {
  let row = null;
  try {
    row = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
  } catch (err) {
    console.error("Upay: failed to read PaymentSettings", err);
  }
  return {
    enabled: row?.upayEnabled ?? false,
    baseUrl: normalizeUpayBase(row?.upayBaseUrl || "") ?? UPAY_UAT_BASE,
    merchantId: row?.upayMerchantId.trim() ?? "",
    merchantKey: row?.upayMerchantKey.trim() ?? "",
    merchantName: row?.upayMerchantName.trim() ?? "",
    merchantCode: row?.upayMerchantCode.trim() ?? "",
    merchantCity: row?.upayMerchantCity.trim() || "Dhaka",
    merchantMobile: row?.upayMerchantMobile.trim() ?? "",
  };
}

function hasCredentials(cfg: UpayConfig): boolean {
  return Boolean(
    cfg.merchantId && cfg.merchantKey && cfg.merchantName && cfg.merchantCode && cfg.merchantMobile,
  );
}

/** True when the admin turned Upay on AND every merchant field is filled in. */
export async function upayConfigured(): Promise<boolean> {
  const cfg = await resolveConfig();
  return cfg.enabled && hasCredentials(cfg);
}

// ---- Token (per server instance) ------------------------------------------

type CachedToken = { token: string; expiresAt: number; fingerprint: string };
let tokenCache: CachedToken | null = null;
// The doc gives no lifetime: keep it briefly and re-authorize on a 401/403.
const TOKEN_TTL_MS = 20 * 60_000;
const TIMEOUT_MS = 20_000;

const fingerprint = (cfg: UpayConfig) => `${cfg.baseUrl}|${cfg.merchantId}|${cfg.merchantKey}`;

/** Clears the cached token. Call after admin saves new credentials. */
export function resetUpayTokenCache() {
  tokenCache = null;
}

type UpayEnvelope<T> = { code?: string; lang?: string; message?: string; data?: T };

async function call<T>(
  cfg: UpayConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; token?: string },
): Promise<{ status: number; json: UpayEnvelope<T> }> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.token ? { Authorization: `UPAY ${init.token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new UpayError(`Could not reach Upay (${err instanceof Error ? err.message : "network error"})`);
  }
  const json = (await res.json().catch(() => ({}))) as UpayEnvelope<T>;
  return { status: res.status, json };
}

const describe = (j: UpayEnvelope<unknown>, status: number) =>
  `${j.code ?? `HTTP ${status}`}: ${j.message ?? "no message"}`;

async function authorize(cfg: UpayConfig): Promise<CachedToken> {
  const { status, json } = await call<{ merchant_id?: string; token?: string }>(
    cfg,
    "/payment/merchant-auth/",
    { method: "POST", body: { merchant_id: cfg.merchantId, merchant_key: cfg.merchantKey } },
  );
  const token = json.data?.token;
  if (status >= 400 || !token) {
    throw new UpayError(`Upay authorization failed (${describe(json, status)})`, json.code ?? null, status);
  }
  return { token, expiresAt: Date.now() + TOKEN_TTL_MS, fingerprint: fingerprint(cfg) };
}

async function getToken(cfg: UpayConfig, fresh = false): Promise<string> {
  const fp = fingerprint(cfg);
  if (!fresh && tokenCache && tokenCache.expiresAt > Date.now() && tokenCache.fingerprint === fp) {
    return tokenCache.token;
  }
  tokenCache = await authorize(cfg);
  return tokenCache.token;
}

/** An authorized call; an expired / revoked token is renewed once. */
async function authed<T>(cfg: UpayConfig, path: string, init: { method: "GET" | "POST"; body?: unknown }) {
  let r = await call<T>(cfg, path, { ...init, token: await getToken(cfg) });
  if (r.status === 401 || r.status === 403) {
    r = await call<T>(cfg, path, { ...init, token: await getToken(cfg, true) });
  }
  return r;
}

/** Checks the saved merchant id + key by asking Upay for a token. */
export async function testUpayConnection(): Promise<{ ok: boolean; baseUrl: string; message: string }> {
  const cfg = await resolveConfig();
  if (!cfg.merchantId || !cfg.merchantKey) {
    return { ok: false, baseUrl: cfg.baseUrl, message: "Merchant ID and Merchant Key are required" };
  }
  try {
    resetUpayTokenCache();
    tokenCache = await authorize(cfg);
    const missing = [
      !cfg.merchantName && "merchant name",
      !cfg.merchantCode && "merchant code",
      !cfg.merchantMobile && "merchant mobile",
    ].filter(Boolean);
    return {
      ok: true,
      baseUrl: cfg.baseUrl,
      message: missing.length
        ? `Authorized, but still missing: ${missing.join(", ")}`
        : "Authorized",
    };
  } catch (err) {
    return { ok: false, baseUrl: cfg.baseUrl, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ---- Payment init -----------------------------------------------------------

/** Today's date in Bangladesh, YYYY-MM-DD. */
function dhakaDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export type UpayInitInput = {
  /** Unique per payment, ≤ 50 chars, alphanumeric. */
  txnId: string;
  invoiceId: string;
  amount: number;
  redirectUrl: string;
};

export type UpayInitResult = {
  sessionId: string;
  txnId: string;
  trxId: string | null;
  gatewayUrl: string;
};

export async function createUpayPayment(input: UpayInitInput): Promise<UpayInitResult> {
  const cfg = await resolveConfig();
  if (!hasCredentials(cfg)) throw new UpayError("Upay is not configured");
  const { status, json } = await authed<{
    session_id?: string;
    txn_id?: string;
    trx_id?: string;
    invoice_id?: string;
    gateway_url?: string;
  }>(cfg, "/payment/merchant-payment-init/", {
    method: "POST",
    body: {
      date: dhakaDate(),
      txn_id: input.txnId,
      invoice_id: input.invoiceId,
      amount: Number(input.amount.toFixed(2)),
      merchant_id: cfg.merchantId,
      merchant_name: cfg.merchantName,
      merchant_code: cfg.merchantCode,
      merchant_country_code: "BD",
      merchant_city: cfg.merchantCity,
      merchant_category_code: cfg.merchantCode,
      merchant_mobile: cfg.merchantMobile,
      transaction_currency_code: "BDT",
      redirect_url: input.redirectUrl,
    },
  });
  const gatewayUrl = json.data?.gateway_url;
  if (status >= 400 || !gatewayUrl || !/^https?:\/\//i.test(gatewayUrl)) {
    throw new UpayError(`Upay payment init failed (${describe(json, status)})`, json.code ?? null, status);
  }
  return {
    sessionId: json.data?.session_id ?? "",
    txnId: json.data?.txn_id ?? input.txnId,
    trxId: json.data?.trx_id ?? null,
    gatewayUrl,
  };
}

// ---- Status -----------------------------------------------------------------

export type UpayPaymentStatus = "success" | "failed" | "cancelled" | "pending" | "expired";

export type UpayStatusResult =
  | {
      found: true;
      status: UpayPaymentStatus | string;
      txnId: string | null;
      trxId: string | null;
      invoiceId: string | null;
      amount: number | null;
      customerWallet: string | null;
    }
  | { found: false };

/**
 * Asks Upay what happened to a payment. `found: false` = Upay has no payment
 * with this txn_id (PNF4012). Network / server errors throw.
 */
export async function queryUpayPayment(txnId: string): Promise<UpayStatusResult> {
  const cfg = await resolveConfig();
  const { status, json } = await authed<{
    txn_id?: string;
    trx_id?: string;
    invoice_id?: string;
    status?: string;
    amount?: number | string;
    customer_wallet?: string;
  }>(cfg, `/payment/single-payment-status/${encodeURIComponent(txnId)}/`, { method: "GET" });
  if (json.code === "PNF4012") return { found: false };
  const d = json.data;
  if (status >= 400 || !d?.status) {
    throw new UpayError(`Upay status check failed (${describe(json, status)})`, json.code ?? null, status);
  }
  const amount = d.amount === undefined || d.amount === null ? NaN : Number(d.amount);
  return {
    found: true,
    status: String(d.status).trim().toLowerCase(),
    txnId: d.txn_id ?? null,
    trxId: d.trx_id ?? null,
    invoiceId: d.invoice_id ?? null,
    amount: Number.isFinite(amount) ? amount : null,
    customerWallet: d.customer_wallet ?? null,
  };
}

// ---- Refund -----------------------------------------------------------------

export type UpayRefundResult =
  | { ok: true; message: string }
  | { ok: false; message: string; code: string | null };

/** Refunds one payment (Upay's bulk refund with a single entry). */
export async function refundUpayPayment(txnId: string, amount: number): Promise<UpayRefundResult> {
  const cfg = await resolveConfig();
  const { status, json } = await authed<{
    success_list?: string[];
    failed_list?: Record<string, { en?: string; bn?: string }>[] | Record<string, { en?: string; bn?: string }>;
  }>(cfg, "/payment/bulk/refund/", {
    method: "POST",
    body: [{ txn_id: txnId, refund_amount: amount.toFixed(2) }],
  });
  const ok = (json.data?.success_list ?? []).some((t) => String(t).trim() === txnId);
  if (ok) return { ok: true, message: json.message ?? "Refunded" };

  // failed_list is a list of {txn_id: {en, bn}} objects (keys may carry stray spaces).
  const failed = json.data?.failed_list;
  const entries = (Array.isArray(failed) ? failed : failed ? [failed] : []).flatMap((o) =>
    Object.entries(o ?? {}),
  );
  const mine = entries.find(([k]) => k.trim() === txnId)?.[1];
  return {
    ok: false,
    code: json.code ?? null,
    message: mine?.en || (status >= 400 ? describe(json, status) : json.message) || "Refund rejected by Upay",
  };
}
