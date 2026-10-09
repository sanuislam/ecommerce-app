import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { blockPhone } from "@/lib/blocklist";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z
    .object({ phone: z.string().min(1).max(20), reason: z.string().trim().max(200).optional().default("") })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a phone number" }, { status: 400 });
  try {
    const row = await blockPhone(parsed.data.phone, parsed.data.reason, session.user.id);
    await audit(session, { action: "blocklist.add", targetType: "phone", targetId: row.phone, summary: `${row.phone} blocked${parsed.data.reason ? `: ${parsed.data.reason}` : ""}` });
    return NextResponse.json({ ok: true, phone: row.phone });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not block" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const row = await prisma.blockedPhone.findUnique({ where: { id } }).catch(() => null);
  await prisma.blockedPhone.deleteMany({ where: { id } });
  if (row) await audit(session, { action: "blocklist.remove", targetType: "phone", targetId: row.phone, summary: `${row.phone} unblocked` });
  return NextResponse.json({ ok: true });
}
