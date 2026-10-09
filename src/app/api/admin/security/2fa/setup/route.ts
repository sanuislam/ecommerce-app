import { NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { adminUser } from "@/lib/admin-auth";
import { checkPassword } from "@/lib/security";
import { newTotpSecret, otpauthUrl, sealSecret } from "@/lib/totp";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";
const SETUP_TTL_MS = 15 * 60_000;

/**
 * Step 1 of turning on two-factor: a new secret to scan. Nothing is saved
 * yet; the secret comes back sealed (bound to this user, 15 minutes) and
 * is saved only when a code from the app proves it was scanned.
 */
export async function POST(req: Request) {
  const session = await adminUser();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await checkPassword(session.user.id, parsed.data.password))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 400 });
  }
  const secret = newTotpSecret();
  const issuer = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
  const url = otpauthUrl(secret, session.user.email ?? session.user.id, `${issuer} Admin`);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  const pending = sealSecret(JSON.stringify({ u: session.user.id, s: secret, e: Date.now() + SETUP_TTL_MS }));
  return NextResponse.json({ secret, url, qr, pending });
}
