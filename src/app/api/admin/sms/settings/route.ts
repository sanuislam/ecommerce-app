import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SMS_EVENTS, SMS_ON_FIELD, SMS_TPL_FIELD } from "@/lib/sms";

export const dynamic = "force-dynamic";

const schema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().trim().max(200), // "" = keep
  senderId: z.string().trim().max(20),
  on: z.object(Object.fromEntries(SMS_EVENTS.map((e) => [e, z.boolean()])) as Record<(typeof SMS_EVENTS)[number], z.ZodBoolean>),
  templates: z.object(
    Object.fromEntries(SMS_EVENTS.map((e) => [e, z.string().trim().max(480)])) as Record<
      (typeof SMS_EVENTS)[number],
      z.ZodString
    >,
  ),
});

export async function PUT(req: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const v = parsed.data;
  const cur = await prisma.smsSettings.findUnique({ where: { id: "default" } });
  const apiKey = v.apiKey || cur?.apiKey || "";
  if (v.enabled && !apiKey) return NextResponse.json({ error: "Enter the Alpha SMS API key" }, { status: 400 });
  const data: Record<string, unknown> = { enabled: v.enabled, apiKey, senderId: v.senderId };
  for (const e of SMS_EVENTS) {
    data[SMS_ON_FIELD[e]] = v.on[e];
    data[SMS_TPL_FIELD[e]] = v.templates[e];
  }
  await prisma.smsSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  return NextResponse.json({ ok: true });
}
