import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Mark a contact message handled (or open again). */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await adminSession("customers");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = z.object({ handled: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const m = await prisma.contactMessage.update({
    where: { id },
    data: parsed.data.handled
      ? { handledAt: new Date(), handledBy: session.user.email ?? session.user.id }
      : { handledAt: null, handledBy: null },
  }).catch(() => null);
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (parsed.data.handled) {
    await audit(session, { action: "message.handled", targetType: "message", targetId: id, summary: `Message from ${m.name} handled` });
  }
  return NextResponse.json({ ok: true });
}
