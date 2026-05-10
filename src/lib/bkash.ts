/**
 * bKash Tokenized Checkout (sandbox + production) client.
 * Docs: https://developer.bka.sh/docs/tokenized-checkout-overview
 *
 * Sandbox base URL: https://tokenized.sandbox.bka.sh/v1.2.0-beta
 * Production base URL: https://tokenized.pay.bka.sh/v1.2.0-beta
 *
 * Flow:
 *  1. POST /tokenized/checkout/token/grant  → id_token (cached in memory ~3600s)
 *  2. POST /tokenized/checkout/create       → bkashURL + paymentID (redirect user)
 *  3. bKash redirects back to callbackURL?paymentID=...&status=success|failure|cancel
 *  4. POST /tokenized/checkout/execute      → final trxID + transactionStatus
 */

const SANDBOX_BASE = "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
const PRODUCTION_BASE = "https://tokenized.pay.bka.sh/v1.2.0-beta";

export type BkashConfig = {
  baseUrl: string;
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
};

export function bkashConfigured(): boolean {
  return Boolean(
    process.env.BKASH_USERNAME &&
      process.env.BKASH_PASSWORD &&
      process.env.BKASH_APP_KEY &&
      process.env.BKASH_APP_SECRET,
  );
}

function getConfig(): BkashConfig {
  const mode = (process.env.BKASH_MODE ?? "sandbox").toLowerCase();
  const fallbackBase = mode === "live" ? PRODUCTION_BASE : SANDBOX_BASE;
  return {
    baseUrl: process.env.BKASH_BASE_URL ?? fallbackBase,
    username: process.env.BKASH_USERNAME ?? "",
    password: process.env.BKASH_PASSWORD ?? "",
    appKey: process.env.BKASH_APP_KEY ?? "",
    appSecret: process.env.BKASH_APP_SECRET ?? "",
  };
}

type CachedToken = {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

// In-memory token cache (per-instance). bKash tokens last 3600s.
let tokenCache: CachedToken | null = null;

async function grantToken(): Promise<CachedToken> {
  const cfg = getConfig();
  const res = await fetch(`${cfg.baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: cfg.username,
      password: cfg.password,
    },
    body: JSON.stringify({ app_key: cfg.appKey, app_secret: cfg.appSecret }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bKash grant_token failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
    statusCode?: string;
    statusMessage?: string;
  };
  if (!data.id_token) {
    throw new Error(
      `bKash grant_token returned no id_token (${data.statusCode ?? "?"}: ${data.statusMessage ?? "unknown"})`,
    );
  }
  const expiresInSec = data.expires_in ?? 3600;
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token ?? "",
    // Refresh ~60s before actual expiry to be safe
    expiresAt: Date.now() + (expiresInSec - 60) * 1000,
  };
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.idToken;
  }
  tokenCache = await grantToken();
  return tokenCache.idToken;
}

export type BkashCreateInput = {
  amount: number;
  invoiceNumber: string;
  payerReference: string;
  callbackURL: string;
};

export type BkashCreateResponse = {
  paymentID: string;
  bkashURL: string;
  statusCode: string;
  statusMessage: string;
  transactionStatus?: string;
};

export async function createBkashPayment(
  input: BkashCreateInput,
): Promise<BkashCreateResponse> {
  const cfg = getConfig();
  const token = await getToken();
  const res = await fetch(`${cfg.baseUrl}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": cfg.appKey,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: input.payerReference || "ec",
      callbackURL: input.callbackURL,
      amount: input.amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: input.invoiceNumber,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bKash create_payment failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as Partial<BkashCreateResponse>;
  if (!data.paymentID || !data.bkashURL) {
    throw new Error(
      `bKash create_payment returned invalid response (${data.statusCode ?? "?"}: ${data.statusMessage ?? "unknown"})`,
    );
  }
  return data as BkashCreateResponse;
}

export type BkashExecuteResponse = {
  paymentID: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: string;
  currency?: string;
  payerReference?: string;
  customerMsisdn?: string;
  paymentExecuteTime?: string;
  merchantInvoiceNumber?: string;
  statusCode?: string;
  statusMessage?: string;
  errorCode?: string;
  errorMessage?: string;
};

export async function executeBkashPayment(
  paymentID: string,
): Promise<BkashExecuteResponse> {
  const cfg = getConfig();
  const token = await getToken();
  const res = await fetch(`${cfg.baseUrl}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": cfg.appKey,
    },
    body: JSON.stringify({ paymentID }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as BkashExecuteResponse;
  return { ...data, paymentID: data.paymentID ?? paymentID };
}

export async function queryBkashPayment(
  paymentID: string,
): Promise<BkashExecuteResponse> {
  const cfg = getConfig();
  const token = await getToken();
  const res = await fetch(`${cfg.baseUrl}/tokenized/checkout/payment/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": cfg.appKey,
    },
    body: JSON.stringify({ paymentID }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as BkashExecuteResponse;
  return { ...data, paymentID: data.paymentID ?? paymentID };
}

export type BkashRefundInput = {
  paymentID: string;
  trxID: string;
  amount: number;
  reason?: string;
  // bKash requires a unique idempotency reference per refund. Pass orderId or random.
  sku?: string;
};

export type BkashRefundResponse = {
  statusCode?: string;
  statusMessage?: string;
  originalTrxID?: string;
  refundTrxID?: string;
  transactionStatus?: string;
  amount?: string;
  currency?: string;
  charge?: string;
  completedTime?: string;
  errorCode?: string;
  errorMessage?: string;
};

export async function refundBkashPayment(
  input: BkashRefundInput,
): Promise<BkashRefundResponse> {
  const cfg = getConfig();
  const token = await getToken();
  const res = await fetch(`${cfg.baseUrl}/tokenized/checkout/payment/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": cfg.appKey,
    },
    body: JSON.stringify({
      paymentID: input.paymentID,
      trxID: input.trxID,
      amount: input.amount.toFixed(2),
      reason: input.reason ?? "Customer refund",
      sku: input.sku ?? input.paymentID,
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as BkashRefundResponse;
  return data;
}
