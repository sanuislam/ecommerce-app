import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { getSeoSettings } from "@/lib/seo-settings";
import { getTrackingSettings, testConversionsApi } from "@/lib/tracking";

export const dynamic = "force-dynamic";

/** Sends one test event with the saved pixel + token. */
export async function POST() {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [seo, t] = await Promise.all([getSeoSettings(), getTrackingSettings()]);
  if (!seo.metaPixelId) return NextResponse.json({ error: "Add the Pixel ID in SEO & PWA first" }, { status: 400 });
  if (!t.fbCapiToken) return NextResponse.json({ error: "Save a Conversions API token first" }, { status: 400 });
  const r = await testConversionsApi(t.fbCapiToken, seo.metaPixelId, t.fbTestCode);
  return r.ok
    ? NextResponse.json({ ok: true, received: r.received })
    : NextResponse.json({ error: `Facebook: ${r.error}` }, { status: 502 });
}
