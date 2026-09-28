import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ productIds: [] });
  const rows = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });
  return NextResponse.json({ productIds: rows.map((r) => r.productId) });
}

const schema = z.object({ productId: z.string().min(1) });

/** Toggles a product in the signed-in user's wishlist. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const userId = session.user.id;
  const { productId } = parsed.data;
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ wishlisted: false });
  }
  const product = await prisma.product.findFirst({
    where: { id: productId, published: true },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const count = await prisma.wishlistItem.count({ where: { userId } });
  if (count >= 200) {
    return NextResponse.json({ error: "Wishlist is full" }, { status: 400 });
  }
  await prisma.wishlistItem.create({ data: { userId, productId } });
  return NextResponse.json({ wishlisted: true });
}
