import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { bdMobile, getSmsSettings, sendSms } from "@/lib/sms";

const TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) =>
  createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${phone}:${code}`).digest("hex");

export type OtpSendResult = { ok: true } | { ok: false; error: string; status: number };

/** Sends a 6-digit code to a phone (rate-limited per phone and per user). */
export async function sendOtp(rawPhone: string, purpose: string, userId: string, shop: string): Promise<OtpSendResult> {
  const phone = bdMobile(rawPhone);
  if (!phone) return { ok: false, error: "Enter a valid mobile number (01XXXXXXXXX)", status: 400 };
  const s = await getSmsSettings();
  if (!s.enabled || !s.apiKey) return { ok: false, error: "SMS is not available right now", status: 503 };
  if (!(await rateLimit(`otp:phone:${phone}`, 1, 60))) {
    return { ok: false, error: "Please wait a minute before asking for a new code", status: 429 };
  }
  if (!(await rateLimit(`otp:phone-h:${phone}`, 5, 3600)) || !(await rateLimit(`otp:user:${userId}`, 8, 3600))) {
    return { ok: false, error: "Too many codes requested. Try again later.", status: 429 };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.create({
    data: { phone, purpose, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + TTL_MS) },
  });
  const r = await sendSms(s.apiKey, phone, `${code} is your ${shop} order code. It expires in 10 minutes.`, s.senderId || undefined);
  if (!r.ok) {
    console.error("OTP SMS failed", r.error);
    return { ok: false, error: "Could not send the code. Try again.", status: 502 };
  }
  return { ok: true };
}

/** Checks (and uses up) the newest code for a phone. */
export async function verifyOtp(rawPhone: string, purpose: string, code: string): Promise<boolean> {
  const phone = bdMobile(rawPhone);
  if (!phone || !/^\d{6}$/.test(code)) return false;
  const row = await prisma.otpCode.findFirst({
    where: { phone, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;
  const ok = timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hash(phone, code)));
  // Claimed with a conditional update: one code places one order.
  const claimed = await prisma.otpCode.updateMany({
    where: { id: row.id, usedAt: null, attempts: { lt: MAX_ATTEMPTS } },
    data: ok ? { usedAt: new Date() } : { attempts: { increment: 1 } },
  });
  return ok && claimed.count === 1;
}
