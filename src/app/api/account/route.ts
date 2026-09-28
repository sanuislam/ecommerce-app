import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeBdPhone } from "@/lib/districts";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(40),
  lastName: z.string().trim().max(40).optional().default(""),
  phone: z.string().trim().max(32).optional().default(""),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { firstName, lastName } = parsed.data;
  let phone: string | null = null;
  if (parsed.data.phone) {
    phone = normalizeBdPhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid mobile number (01XXXXXXXXX)" }, { status: 400 });
    }
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { firstName, lastName: lastName || null, name: `${firstName} ${lastName}`.trim(), phone },
  });
  return NextResponse.json({ ok: true });
}
