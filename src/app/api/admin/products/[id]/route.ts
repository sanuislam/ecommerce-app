import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { slugify } from "@/lib/utils";
import { firstIssue, syncVariants, variantsSchema } from "../_lib/variants";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  slug: z.string().min(1).optional(),
  description: z.string().trim().min(1, "Description is required").optional(),
  price: z.number().nonnegative("Price cannot be negative").optional(),
  compareAt: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative("Stock cannot be negative").optional(),
  images: z.array(z.string().url("Each image must be a valid URL")).optional(),
  featured: z.boolean().optional(),
  flashDeal: z.boolean().optional(),
  flashDealDiscount: z.number().int().min(1).max(99).nullable().optional(),
  published: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
  variants: variantsSchema.optional(),
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
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { variants, ...data } = parsed.data;
  if (data.slug !== undefined) {
    data.slug = slugify(data.slug);
    if (!data.slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }
  }
  if (data.flashDeal === false) {
    data.flashDealDiscount = null;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.product.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;

      if (variants !== undefined) {
        if (variants.length > 0) {
          data.stock = await syncVariants(tx, id, variants);
        } else {
          await tx.productVariant.deleteMany({ where: { productId: id } });
        }
      } else if (data.stock !== undefined) {
        // Variants weren't sent: stock is owned by the variants if there are any.
        const count = await tx.productVariant.count({ where: { productId: id } });
        if (count > 0) delete data.stock;
      }

      return tx.product.update({ where: { id }, data });
    });
    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("update product failed", err);
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
