import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { slugify } from "@/lib/utils";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  compareAt: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().optional(),
  images: z.array(z.string().url()).optional(),
  featured: z.boolean().optional(),
  flashDeal: z.boolean().optional(),
  flashDealDiscount: z.number().int().min(1).max(99).nullable().optional(),
  published: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
}).refine(
  (d) =>
    d.flashDeal !== true ||
    (d.flashDealDiscount != null && d.flashDealDiscount >= 1 && d.flashDealDiscount <= 99),
  { message: "Flash deal discount % is required (1-99) when flash deal is on", path: ["flashDealDiscount"] },
);

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) return null;
  return session.user;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = { ...parsed.data };
  if (data.slug) data.slug = slugify(data.slug);
  if (data.flashDeal === false) {
    data.flashDealDiscount = null;
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Could not update" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete (has orders?)" },
      { status: 400 },
    );
  }
}
