import { auth } from "@/auth";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DebugAuthPage() {
  const h = await headers();
  const c = await cookies();
  const cookieHeader = h.get("cookie") ?? "";
  const names = c.getAll().map((cc) => cc.name);
  const sessionCookie =
    c.get("__Secure-authjs.session-token")?.value ??
    c.get("authjs.session-token")?.value ??
    null;

  let session: unknown = null;
  let err: string | null = null;
  try {
    session = await auth();
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  return (
    <pre style={{ padding: 20 }}>
      {JSON.stringify(
        {
          cookieHeaderLen: cookieHeader.length,
          cookieHeaderPreview: cookieHeader.slice(0, 80),
          cookieNames: names,
          sessionCookiePresent: !!sessionCookie,
          sessionCookieLen: sessionCookie?.length ?? 0,
          session,
          err,
          hostHeader: h.get("host"),
          xfProto: h.get("x-forwarded-proto"),
          xfHost: h.get("x-forwarded-host"),
        },
        null,
        2,
      )}
    </pre>
  );
}
