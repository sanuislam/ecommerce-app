import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  /** Omitted = keep the saved token; "" = remove it. */
  fbCapiToken: z.string().trim().max(500).optional(),
  fbTestCode: z.string().trim().max(40),
  feedEnabled: z.boolean(),
});

export async function PUT(req: Request) {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { fbCapiToken, ...rest } = parsed.data;
  const data = { ...rest, ...(fbCapiToken !== undefined ? { fbCapiToken } : {}) };
  await prisma.trackingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  await audit(session, {
    action: "settings.tracking",
    summary: `Pixel & analytics saved${fbCapiToken !== undefined ? (fbCapiToken ? " (new Conversions API token)" : " (token removed)") : ""}`,
    data: { fbTestCode: rest.fbTestCode, feedEnabled: rest.feedEnabled },
  });
  return NextResponse.json({ ok: true });
}
