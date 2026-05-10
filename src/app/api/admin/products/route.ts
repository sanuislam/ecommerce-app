import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { slugify } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().min(1),
  price: z.number().nonnegative(),
  compareAt: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(),
  images: z.array(z.string().url()).default([]),
  featured: z.boolean().default(false),
  flashDeal: z.boolean().default(false),
  flashDealDiscount: z.number().int().min(1).max(99).nullable().optional(),
  published: z.boolean().default(true),
  categoryId: z.string().nullable().optional(),
}).refine(
  (d) => !d.flashDeal || (d.flashDealDiscount != null && d.flashDealDiscount >= 1 && d.flashDealDiscount <= 99),
  { message: "Flash deal discount % is required (1-99) when flash deal is on", path: ["flashDealDiscount"] },
);

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const slug = data.slug || slugify(data.name);

  try {
    const product = await prisma.product.create({
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
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 409 },
    );
  }
}
