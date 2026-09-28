import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().default(""),
  comment: z.string().trim().max(2000).optional().default(""),
});

/** Create or update the signed-in customer's review. Verified buyers only. */
export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in to review" }, { status: 401 });
  }
  if (!(await rateLimit(`review:${session.user.id}`, 10, 3600))) {
    return NextResponse.json({ error: "Too many reviews, try later" }, { status: 429 });
  }
  const { slug } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const bought = await prisma.orderItem.findFirst({
    where: {
      productId: product.id,
      order: { userId: session.user.id, status: "DELIVERED" },
    },
    select: { id: true },
  });
  if (!bought) {
    return NextResponse.json(
      { error: "You can review this product after it has been delivered to you" },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = {
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    comment: parsed.data.comment || null,
  };
  await prisma.review.upsert({
    where: { productId_userId: { productId: product.id, userId: session.user.id } },
    update: data,
    create: { ...data, productId: product.id, userId: session.user.id },
  });
  revalidatePath(`/products/${slug}`);
  return NextResponse.json({ ok: true });
}
