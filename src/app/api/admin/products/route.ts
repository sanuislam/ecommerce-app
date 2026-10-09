import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { firstIssue, syncVariants, variantsSchema } from "./_lib/variants";
import { logStockDiff, stockSnapshot } from "@/lib/stock-log";
import { audit } from "@/lib/audit";

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().trim().min(1, "Description is required"),
  price: z.number().nonnegative("Price cannot be negative"),
  compareAt: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative("Stock cannot be negative"),
  images: z.array(z.string().url("Each image must be a valid URL")).default([]),
  featured: z.boolean().default(false),
  flashDeal: z.boolean().default(false),
  flashDealDiscount: z.number().int().min(1).max(99).nullable().optional(),
  published: z.boolean().default(true),
  categoryId: z.string().nullable().optional(),
  costPrice: z.number().nonnegative("Cost cannot be negative").nullable().optional(),
  lowStockAt: z.number().int().min(0).max(100000).nullable().optional(),
  tags: z
    .array(z.string().trim().toLowerCase().max(40))
    .max(20)
    .transform((t) => [...new Set(t.map((x) => x.replace(/\s+/g, "-")).filter(Boolean))])
    .default([]),
  variants: variantsSchema.default([]),
}).refine(
  (d) => !d.flashDeal || (d.flashDealDiscount != null && d.flashDealDiscount >= 1 && d.flashDealDiscount <= 99),
  { message: "Flash deal discount % is required (1-99) when flash deal is on", path: ["flashDealDiscount"] },
);

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, session.user.staffRole, "products")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, variants: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, session.user.staffRole, "products")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;
  const slug = slugify(data.slug || data.name);
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          price: data.price,
          compareAt: data.compareAt ?? null,
          stock: data.stock,
          images: data.images,
          featured: data.featured,
          flashDeal: data.flashDeal,
          flashDealDiscount: data.flashDeal ? (data.flashDealDiscount ?? null) : null,
          published: data.published,
          categoryId: data.categoryId ?? null,
          costPrice: data.costPrice ?? null,
          lowStockAt: data.lowStockAt ?? null,
          tags: data.tags,
        },
      });
      const before = await stockSnapshot(tx, []);
      const done =
        data.variants.length === 0
          ? created
          : await tx.product.update({
              where: { id: created.id },
              data: { stock: await syncVariants(tx, created.id, data.variants) },
            });
      await logStockDiff(tx, before, [created.id], { reason: "initial", userId: session.user.id });
      return done;
    });
    await audit(session, {
      action: "product.create",
      targetType: "product",
      targetId: product.id,
      summary: `"${product.name}" created at ৳${Number(product.price)}`,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("create product failed", err);
    return NextResponse.json({ error: "Could not create product" }, { status: 400 });
  }
}
