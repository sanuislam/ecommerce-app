import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");

  const where: Prisma.ProductWhereInput = { published: true };
  if (featured === "1") where.featured = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = { slug: category };

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { category: true },
    take: 100,
  });
  return NextResponse.json(products);
}
