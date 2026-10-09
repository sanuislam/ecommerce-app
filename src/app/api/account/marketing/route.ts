import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** The customer's own choice about promotional SMS (offers, cart reminders). */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = z.object({ smsOffers: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await prisma.user.update({ where: { id: session.user.id }, data: { smsOptOut: !parsed.data.smsOffers } });
  return NextResponse.json({ ok: true });
}
