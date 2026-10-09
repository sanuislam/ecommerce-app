import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ids = z.array(z.string().min(1)).min(1).max(500);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), ids, value: z.boolean() }),
  z.object({ action: z.literal("category"), ids, categoryId: z.string().min(1).nullable() }),
  z.object({ action: z.literal("price"), ids, percent: z.number().min(-90).max(500) }),
  z.object({ action: z.literal("tag"), ids, tag: z.string().trim().min(1).max(40), add: z.boolean() }),
]);

/** Changes many products at once. Prices round to whole taka. */
export async function POST(req: Request) {
  const session = await adminSession("products");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const b = parsed.data;
  let updated = 0;

  if (b.action === "publish") {
    updated = (await prisma.product.updateMany({ where: { id: { in: b.ids } }, data: { published: b.value } })).count;
  } else if (b.action === "category") {
    if (b.categoryId && !(await prisma.category.findUnique({ where: { id: b.categoryId }, select: { id: true } }))) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    updated = (await prisma.product.updateMany({ where: { id: { in: b.ids } }, data: { categoryId: b.categoryId } })).count;
  } else if (b.action === "price") {
    const f = 1 + b.percent / 100;
    updated = await prisma.$transaction(async (tx) => {
      const n = await tx.$executeRaw`
        UPDATE "Product" SET "price" = GREATEST(0, ROUND("price" * ${f})),
          "compareAt" = CASE WHEN "compareAt" IS NULL THEN NULL ELSE GREATEST(0, ROUND("compareAt" * ${f})) END
        WHERE "id" = ANY(${b.ids})`;
      await tx.$executeRaw`
        UPDATE "ProductVariant" SET "price" = GREATEST(0, ROUND("price" * ${f}))
        WHERE "price" IS NOT NULL AND "productId" = ANY(${b.ids})`;
      return n;
    });
  } else {
    const tag = slugify(b.tag);
    if (!tag) return NextResponse.json({ error: "Enter a tag" }, { status: 400 });
    updated = b.add
      ? await prisma.$executeRaw`
          UPDATE "Product" SET "tags" = array_append("tags", ${tag})
          WHERE "id" = ANY(${b.ids}) AND NOT (${tag} = ANY("tags"))`
      : await prisma.$executeRaw`
          UPDATE "Product" SET "tags" = array_remove("tags", ${tag}) WHERE "id" = ANY(${b.ids}) AND ${tag} = ANY("tags")`;
  }
  revalidatePath("/", "layout");
  const what =
    b.action === "publish"
      ? b.value ? "published" : "hidden"
      : b.action === "category"
        ? "category changed"
        : b.action === "price"
          ? `prices ${b.percent > 0 ? "+" : ""}${b.percent}%`
          : `tag "${b.tag}" ${b.add ? "added" : "removed"}`;
  await audit(session, { action: "product.bulk", summary: `${updated} product(s): ${what}`, data: { ids: b.ids } });
  return NextResponse.json({ ok: true, updated });
}
