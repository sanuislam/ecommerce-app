import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        orderBy: { position: "asc" },
        select: { id: true, size: true, color: true, price: true, stock: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        // Never expose reviewer ids or emails.
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!product || !product.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}
