import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/auth";
import { decode } from "@auth/core/jwt";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const c = await cookies();

  const cookieHeader = h.get("cookie") ?? "";
  const allCookies = c.getAll().map((cc) => cc.name);
  const sessionCookie =
    c.get("__Secure-authjs.session-token")?.value ??
    c.get("authjs.session-token")?.value ??
    null;

  let authResult: unknown = null;
  let authErr: string | null = null;
  try {
    authResult = await auth();
  } catch (e) {
    authErr = e instanceof Error ? e.message : String(e);
  }

  let decoded: unknown = null;
  let decodeErr: string | null = null;
  if (sessionCookie && process.env.NEXTAUTH_SECRET) {
    try {
      decoded = await decode({
        token: sessionCookie,
        secret: process.env.NEXTAUTH_SECRET,
        salt: "__Secure-authjs.session-token",
      });
    } catch (e) {
      decodeErr = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    cookieHeaderLen: cookieHeader.length,
    cookieHeaderPreview: cookieHeader.slice(0, 120),
    cookieNames: allCookies,
    sessionCookiePresent: !!sessionCookie,
    sessionCookieLen: sessionCookie?.length ?? 0,
    authResult,
    authErr,
    decoded,
    decodeErr,
    env: {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
      authUrl: process.env.AUTH_URL ?? null,
      nextauthUrl: process.env.NEXTAUTH_URL ?? null,
      authTrustHost: process.env.AUTH_TRUST_HOST ?? null,
      vercel: process.env.VERCEL ?? null,
    },
  });
}
