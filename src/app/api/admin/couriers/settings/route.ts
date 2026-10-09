import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getCourierSettings } from "@/lib/couriers";
import { resetPathaoToken } from "@/lib/couriers/pathao";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const str = (max: number) => z.string().trim().max(max);
const schema = z.object({
  defaultWeightKg: z.number().min(0.1).max(10),
  steadfastEnabled: z.boolean(),
  steadfastApiKey: str(200),
  steadfastSecretKey: str(200), // "" = keep
  steadfastWebhookToken: str(200), // "" = keep
  pathaoEnabled: z.boolean(),
  pathaoMode: z.enum(["sandbox", "live"]),
  pathaoClientId: str(200),
  pathaoClientSecret: str(300), // "" = keep
  pathaoUsername: str(200),
  pathaoPassword: str(200), // "" = keep
  pathaoStoreId: z.number().int().positive().nullable(),
  pathaoWebhookSecret: str(200), // "" = keep
  redxEnabled: z.boolean(),
  redxMode: z.enum(["sandbox", "live"]),
  redxToken: str(2000), // "" = keep
  redxPickupStoreId: z.number().int().positive().nullable(),
});

export async function PUT(req: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const v = parsed.data;
  const cur = await getCourierSettings();
  const keep = (next: string, old: string) => next || old;
  const data = {
    defaultWeightKg: v.defaultWeightKg,
    steadfastEnabled: v.steadfastEnabled,
    steadfastApiKey: v.steadfastApiKey,
    steadfastSecretKey: keep(v.steadfastSecretKey, cur.steadfastSecretKey),
    steadfastWebhookToken: keep(v.steadfastWebhookToken, cur.steadfastWebhookToken),
    pathaoEnabled: v.pathaoEnabled,
    pathaoMode: v.pathaoMode,
    pathaoClientId: v.pathaoClientId,
    pathaoClientSecret: keep(v.pathaoClientSecret, cur.pathaoClientSecret),
    pathaoUsername: v.pathaoUsername,
    pathaoPassword: keep(v.pathaoPassword, cur.pathaoPassword),
    pathaoStoreId: v.pathaoStoreId,
    pathaoWebhookSecret: keep(v.pathaoWebhookSecret, cur.pathaoWebhookSecret),
    redxEnabled: v.redxEnabled,
    redxMode: v.redxMode,
    redxToken: keep(v.redxToken, cur.redxToken),
    redxPickupStoreId: v.redxPickupStoreId,
  };
  await prisma.courierSettings.update({ where: { id: "default" }, data });
  const pathaoChanged =
    data.pathaoMode !== cur.pathaoMode ||
    data.pathaoClientId !== cur.pathaoClientId ||
    data.pathaoClientSecret !== cur.pathaoClientSecret ||
    data.pathaoUsername !== cur.pathaoUsername ||
    data.pathaoPassword !== cur.pathaoPassword;
  if (pathaoChanged) await resetPathaoToken();
  await audit(session, { action: "settings.couriers", summary: "Courier settings saved", data: v });
  return NextResponse.json({ ok: true });
}
