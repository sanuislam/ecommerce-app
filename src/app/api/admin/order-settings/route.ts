import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  codOtpRequired: z.boolean(),
  codMaxAmount: z.number().int().min(0).max(10_000_000).nullable(),
  returnsEnabled: z.boolean(),
  returnWindowDays: z.number().int().min(1).max(90),
  lowStockDefault: z.number().int().min(0).max(100000).optional(),
});

export async function PUT(req: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  await prisma.orderSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/checkout");
  return NextResponse.json({ ok: true });
}
