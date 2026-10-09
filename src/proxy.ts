import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessPath, isAdminUser } from "@/lib/permissions";

const ADMIN_PATHS = ["/admin", "/print", "/api/admin"];
const OWNER_ONLY_PATHS = ["/studio"];
const USER_PATHS = ["/account", "/orders", "/checkout", "/wishlist"];

const startsWithAny = (pathname: string, list: string[]) =>
  list.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Express-style routers match any case; compare lower-cased.
  const path = pathname.toLowerCase();

  const isAdminPath = startsWithAny(path, ADMIN_PATHS);
  const isOwnerPath = startsWithAny(path, OWNER_ONLY_PATHS);
  const isUserPath = startsWithAny(path, USER_PATHS);
  if (!isAdminPath && !isOwnerPath && !isUserPath) return NextResponse.next();

  const isApi = path.startsWith("/api/");
  const secureCookie =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    secureCookie,
    cookieName,
    salt: cookieName,
  });

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = token.role as string | undefined;
  const staffRole = (token.staffRole as string | null | undefined) ?? null;

  if (isOwnerPath && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAdminPath) {
    if (!isAdminUser(role, staffRole)) {
      if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/", request.url));
    }
    // The owner requires two-factor: only "My security" until it is on.
    if (token.needs2fa && !path.startsWith("/admin/security") && !path.startsWith("/api/admin/security")) {
      if (isApi) return NextResponse.json({ error: "Turn on two-factor sign-in first (My security)" }, { status: 403 });
      return NextResponse.redirect(new URL("/admin/security?required=1", request.url));
    }
    // Staff only reach the parts their role allows.
    if (!canAccessPath(role, staffRole, path)) {
      if (isApi) return NextResponse.json({ error: "Your role can't do this" }, { status: 403 });
      return NextResponse.redirect(new URL("/admin?denied=1", request.url));
    }
  }

  if (isAdminPath && !isApi) {
    // The admin layout reads the path (two-factor setup gate).
    const headers = new Headers(request.headers);
    headers.set("x-admin-path", path);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/print/:path*",
    "/api/admin/:path*",
    "/studio/:path*",
    "/account/:path*",
    "/orders/:path*",
    "/checkout/:path*",
    "/wishlist/:path*",
  ],
};
