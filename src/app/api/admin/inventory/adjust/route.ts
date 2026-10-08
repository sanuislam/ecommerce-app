import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { logStock } from "@/lib/stock-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  mode: z.enum(["add", "set"]),
  amount: z.number().int().min(-100000).max(100000),
  note: z.string().trim().max(200).optional().default(""),
});

/** Stock received, counted or written off — always logged with a reason. */
export async function POST(req: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { productId, variantId, mode, amount, note } = parsed.data;
  if (mode === "set" && amount < 0) return NextResponse.json({ error: "Stock can't be below 0" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the row so a sale at the same moment can't be lost.
      if (variantId) {
        const [v] = await tx.$queryRaw<{ stock: number; productId: string }[]>`
          SELECT "stock", "productId" FROM "ProductVariant" WHERE "id" = ${variantId} FOR UPDATE`;
        if (!v || v.productId !== productId) throw new Error("Option not found");
        const next = mode === "set" ? amount : v.stock + amount;
        if (next < 0) throw new Error(`Only ${v.stock} in stock`);
        await tx.productVariant.update({ where: { id: variantId }, data: { stock: next } });
        const agg = await tx.productVariant.aggregate({ where: { productId }, _sum: { stock: true } });
        await tx.product.update({ where: { id: productId }, data: { stock: agg._sum.stock ?? 0 } });
        await logStock(tx, [{ productId, variantId, change: next - v.stock, reason: "adjust", note, userId: session.user.id }]);
        return next;
      }
      const [p] = await tx.$queryRaw<{ stock: number }[]>`
        SELECT "stock" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
      if (!p) throw new Error("Product not found");
      const hasVariants = await tx.productVariant.count({ where: { productId } });
      if (hasVariants) throw new Error("This product has options: adjust an option");
      const next = mode === "set" ? amount : p.stock + amount;
      if (next < 0) throw new Error(`Only ${p.stock} in stock`);
      await tx.product.update({ where: { id: productId }, data: { stock: next } });
      await logStock(tx, [{ productId, change: next - p.stock, reason: "adjust", note, userId: session.user.id }]);
      return next;
    });
    return NextResponse.json({ ok: true, stock: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not adjust" }, { status: 400 });
  }
}
