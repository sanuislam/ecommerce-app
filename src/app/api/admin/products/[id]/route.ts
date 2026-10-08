import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role, type Prisma } from "@/generated/prisma";
import { logStockDiff, stockSnapshot } from "@/lib/stock-log";
import { slugify } from "@/lib/utils";
import { firstIssue, syncVariants, variantsSchema } from "../_lib/variants";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  slug: z.string().min(1).optional(),
  description: z.string().trim().min(1, "Description is required").optional(),
  price: z.number().nonnegative("Price cannot be negative").optional(),
  compareAt: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative("Stock cannot be negative").optional(),
  /** Stock shown when the form was opened (see syncVariants). */
  stockBase: z.number().int().nonnegative().optional(),
  images: z.array(z.string().url("Each image must be a valid URL")).optional(),
  featured: z.boolean().optional(),
  flashDeal: z.boolean().optional(),
  flashDealDiscount: z.number().int().min(1).max(99).nullable().optional(),
  published: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
  costPrice: z.number().nonnegative("Cost cannot be negative").nullable().optional(),
  lowStockAt: z.number().int().min(0).max(100000).nullable().optional(),
  tags: z
    .array(z.string().trim().toLowerCase().max(40))
    .max(20)
    .transform((t) => [...new Set(t.map((x) => x.replace(/\s+/g, "-")).filter(Boolean))])
    .optional(),
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

  const { variants, stockBase, ...data } = parsed.data;
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
    // The edit itself; stock changes are logged around it.
    async function save(tx: Prisma.TransactionClient) {
      if (variants !== undefined) {
        if (variants.length > 0) {
          data.stock = await syncVariants(tx, id, variants);
        } else {
          await tx.productVariant.deleteMany({ where: { productId: id } });
        }
      }
      const variantCount = await tx.productVariant.count({ where: { productId: id } });
      if (variantCount === 0 && data.stock !== undefined && stockBase !== undefined) {
        // Apply the admin's change as a delta so concurrent orders aren't overwritten.
        const delta = data.stock - stockBase;
        delete data.stock;
        const p = await tx.product.update({
          where: { id },
          data: { ...data, ...(delta ? { stock: { increment: delta } } : {}) },
        });
        return p.stock < 0 ? tx.product.update({ where: { id }, data: { stock: 0 } }) : p;
      }
      if (variantCount > 0 && variants === undefined) {
        // Variants weren't sent: stock is owned by the variants.
        delete data.stock;
      }

      return tx.product.update({ where: { id }, data });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.product.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      const before = await stockSnapshot(tx, [id]);
      const result = await save(tx);
      await logStockDiff(tx, before, [id], { reason: "edit", userId: user.id });
      return result;
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
