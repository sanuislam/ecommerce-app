import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

/** One size/colour option as submitted by the admin product form. */
export const variantSchema = z
  .object({
    id: z.string().min(1).optional(),
    size: z.string().trim().max(40, "Size is too long").default(""),
    color: z.string().trim().max(40, "Colour is too long").default(""),
    price: z
      .number()
      .nonnegative("Option price cannot be negative")
      .nullable()
      .default(null),
    stock: z
      .number()
      .int("Option stock must be a whole number")
      .nonnegative("Option stock cannot be negative"),
    sku: z.string().trim().max(64, "SKU is too long").nullish(),
    costPrice: z.number().nonnegative("Option cost cannot be negative").nullable().optional(),
    /** Stock shown when the form was opened; lets the save apply a delta. */
    stockBase: z.number().int().nonnegative().optional(),
  })
  .refine((v) => v.size !== "" || v.color !== "", {
    message: "Each option needs a size or a colour",
  });

export const variantsSchema = z
  .array(variantSchema)
  .max(200, "Too many options (max 200)")
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((r, i) => {
      const key = `${r.size.toLowerCase()}\u0000${r.color.toLowerCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: [i],
          message: `Duplicate option: ${[r.size, r.color].filter(Boolean).join(" / ")}`,
        });
      }
      seen.add(key);
    });
  });

export type VariantInput = z.infer<typeof variantSchema>;

/** Returns zod's first issue as a human-readable message. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const [head, idx] = issue.path;
  if (head === "variants" && typeof idx === "number") {
    return `Option ${idx + 1}: ${issue.message}`;
  }
  return issue.message;
}

/**
 * Replaces a product's variants with `rows` (update by id, create new,
 * delete removed) and returns the total stock across them.
 *
 * For existing options the admin's edit is applied as a delta against the
 * stock the form loaded (`stockBase`), so orders placed or cancelled while the
 * form was open are not overwritten.
 * Must run inside a transaction.
 */
export async function syncVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  rows: VariantInput[],
): Promise<number> {
  const existing = await tx.productVariant.findMany({ where: { productId } });
  const byId = new Map(existing.map((v) => [v.id, v]));
  const keyOf = (v: { size: string; color: string }) => `${v.size}\u0000${v.color}`;
  const byKey = new Map(existing.map((v) => [keyOf(v), v]));

  // Resolve which existing row each submitted row maps onto. A new row with
  // the same size/colour as an existing one reuses it (keeps order history).
  const claimed = new Set<string>();
  const resolved = rows.map((r) => {
    let id = r.id && byId.has(r.id) && !claimed.has(r.id) ? r.id : undefined;
    if (!id) {
      const match = byKey.get(keyOf(r));
      if (match && !claimed.has(match.id) && !rows.some((o) => o.id === match.id)) {
        id = match.id;
      }
    }
    if (id) claimed.add(id);
    return { ...r, id };
  });

  const removed = existing.filter((v) => !claimed.has(v.id)).map((v) => v.id);
  if (removed.length) {
    await tx.productVariant.deleteMany({ where: { id: { in: removed } } });
  }

  // Rows whose size/colour changed are first moved to a temporary key so
  // swaps between rows don't trip the (productId, size, color) unique index.
  const changed = resolved.filter((r) => {
    if (!r.id) return false;
    const prev = byId.get(r.id)!;
    return prev.size !== r.size || prev.color !== r.color;
  });
  for (const r of changed) {
    await tx.productVariant.update({
      where: { id: r.id },
      data: { size: `__tmp__${r.id}`, color: "" },
    });
  }

  for (const [position, r] of resolved.entries()) {
    const data = {
      size: r.size,
      color: r.color,
      price: r.price,
      sku: r.sku || null,
      ...(r.costPrice !== undefined ? { costPrice: r.costPrice } : {}),
      position,
    };
    const submittedId = r.id && r.id === rows[position]?.id;
    if (r.id && submittedId && r.stockBase !== undefined) {
      const delta = r.stock - r.stockBase;
      const updated = await tx.productVariant.update({
        where: { id: r.id },
        data: { ...data, ...(delta ? { stock: { increment: delta } } : {}) },
      });
      if (updated.stock < 0) {
        await tx.productVariant.update({ where: { id: r.id }, data: { stock: 0 } });
      }
    } else if (r.id) {
      await tx.productVariant.update({ where: { id: r.id }, data: { ...data, stock: r.stock } });
    } else {
      await tx.productVariant.create({ data: { ...data, stock: r.stock, productId } });
    }
  }
  const agg = await tx.productVariant.aggregate({
    where: { productId },
    _sum: { stock: true },
  });
  return agg._sum.stock ?? 0;
}
