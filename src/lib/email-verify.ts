import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/site-url";

const TTL_MS = 24 * 3600_000;

function key() {
  const k = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!k) throw new Error("AUTH_SECRET is not set");
  return k;
}
const sign = (body: string) => createHmac("sha256", key()).update(`email-verify.${body}`).digest("base64url");

/**
 * A link that proves the customer reads `email`. It names the account, the
 * new address and the address the account had when it was made: once the
 * e-mail changes, older links stop working (one use in practice).
 */
export function emailVerifyLink(userId: string, email: string, currentEmail: string): string {
  const body = Buffer.from(JSON.stringify({ u: userId, e: email, p: currentEmail, x: Date.now() + TTL_MS })).toString("base64url");
  return `${siteUrl()}/api/account/email/verify?t=${body}.${sign(body)}`;
}

export function readEmailToken(token: string): { userId: string; email: string; prev: string } | null {
  const [body, mac] = token.split(".");
  if (!body || !mac || body.length > 1000) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const o = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: string; e?: string; p?: string; x?: number };
    if (!o.u || !o.e || typeof o.p !== "string" || !o.x || o.x < Date.now()) return null;
    return { userId: o.u, email: o.e, prev: o.p };
  } catch {
    return null;
  }
}
