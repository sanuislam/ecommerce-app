import { auth } from "@/auth";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DebugShopPage() {
  const h = await headers();
  const c = await cookies();
  const cookieHeader = h.get("cookie") ?? "";
  const names = c.getAll().map((cc) => cc.name);

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
          path: "/(shop)/debug-shop",
          cookieHeaderLen: cookieHeader.length,
          cookieNames: names,
          session,
          err,
          host: h.get("host"),
          xfProto: h.get("x-forwarded-proto"),
        },
        null,
        2,
      )}
    </pre>
  );
}
