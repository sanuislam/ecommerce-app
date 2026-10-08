import "server-only";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { logStockDiff, stockSnapshot } from "@/lib/stock-log";
import type { Prisma } from "@/generated/prisma";

/**
 * Products as CSV: one row per sellable unit (a product without options, or
 * one option). Import updates what the file has and creates what is new;
 * an empty cell leaves the saved value as it is.
 */
export const CSV_HEADERS = [
  "product_id",
  "variant_id",
  "name",
  "slug",
  "category",
  "size",
  "color",
  "sku",
  "price",
  "option_price",
  "compare_at",
  "cost_price",
  "option_cost",
  "stock",
  "low_stock_at",
  "published",
  "featured",
  "tags",
  "images",
  "description",
] as const;
type Col = (typeof CSV_HEADERS)[number];

export const MAX_IMPORT_ROWS = 5000;

// ---------- CSV text ----------

function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180: quoted fields, "" escapes, newlines inside quotes; BOM ignored. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export async function exportProductsCsv(): Promise<string> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: { category: true, variants: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  const lines: string[] = [CSV_HEADERS.join(",")];
  for (const p of products) {
    const base: Record<Col, unknown> = {
      product_id: p.id,
      variant_id: "",
      name: p.name,
      slug: p.slug,
      category: p.category?.name ?? "",
      size: "",
      color: "",
      sku: "",
      price: Number(p.price).toFixed(2),
      option_price: "",
      compare_at: p.compareAt != null ? Number(p.compareAt).toFixed(2) : "",
      cost_price: p.costPrice != null ? Number(p.costPrice).toFixed(2) : "",
      option_cost: "",
      stock: p.stock,
      low_stock_at: p.lowStockAt ?? "",
      published: p.published ? "yes" : "no",
      featured: p.featured ? "yes" : "no",
      tags: p.tags.join("|"),
      images: p.images.join("|"),
      description: p.description,
    };
    const units = p.variants.length
      ? p.variants.map((v) => ({
          ...base,
          variant_id: v.id,
          size: v.size,
          color: v.color,
          sku: v.sku ?? "",
          option_price: v.price != null ? Number(v.price).toFixed(2) : "",
          option_cost: v.costPrice != null ? Number(v.costPrice).toFixed(2) : "",
          stock: v.stock,
        }))
      : [base];
    for (const u of units) lines.push(CSV_HEADERS.map((h) => cell(u[h])).join(","));
  }
  return "﻿" + lines.join("\r\n");
}

// ---------- import plan ----------

type UnitSet = { stock?: number; price?: number | null; cost?: number | null; sku?: string | null };
type UnitPlan = { line: number; variantId?: string; create?: { size: string; color: string }; set: UnitSet };
type ProductFields = {
  name?: string;
  slug?: string;
  description?: string;
  categoryName?: string | null;
  price?: number;
  compareAt?: number | null;
  costPrice?: number | null;
  lowStockAt?: number | null;
  published?: boolean;
  featured?: boolean;
  tags?: string[];
  images?: string[];
};
export type ProductPlan = {
  key: string;
  label: string;
  productId?: string;
  hasVariants: boolean;
  fields: ProductFields;
  units: UnitPlan[];
};
export type ImportPlan = {
  products: ProductPlan[];
  errors: { line: number; message: string }[];
  warnings: { line: number; message: string }[];
  summary: { updateProducts: number; createProducts: number; createOptions: number; rows: number };
};

const num = (v: string) => {
  const n = Number(v.replace(/[,৳\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const yes = (v: string) => /^(y|yes|true|1)$/i.test(v.trim());

export async function planImport(text: string): Promise<ImportPlan> {
  const table = parseCsv(text);
  const errors: ImportPlan["errors"] = [];
  const warnings: ImportPlan["warnings"] = [];
  if (table.length < 2) return { products: [], errors: [{ line: 1, message: "The file has no rows" }], warnings, summary: { updateProducts: 0, createProducts: 0, createOptions: 0, rows: 0 } };
  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const idx = new Map<string, number>();
  header.forEach((h, i) => idx.set(h, i));
  if (!idx.has("name") && !idx.has("product_id") && !idx.has("sku") && !idx.has("variant_id") && !idx.has("slug")) {
    errors.push({ line: 1, message: "Header must include product_id, variant_id, sku, slug or name" });
  }
  const rows = table.slice(1);
  if (rows.length > MAX_IMPORT_ROWS) errors.push({ line: 1, message: `At most ${MAX_IMPORT_ROWS} rows per file` });
  if (errors.length) return { products: [], errors, warnings, summary: { updateProducts: 0, createProducts: 0, createOptions: 0, rows: rows.length } };

  const products = await prisma.product.findMany({ include: { variants: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const variantById = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, { v, p }] as const)));
  const variantBySku = new Map(
    products.flatMap((p) => p.variants.filter((v) => v.sku).map((v) => [v.sku!.toLowerCase(), { v, p }] as const)),
  );

  const plans = new Map<string, ProductPlan>();
  rows.forEach((r, i) => {
    const line = i + 2;
    const get = (c: Col) => (idx.has(c) ? (r[idx.get(c)!] ?? "").trim().replace(/^'(?=[=+\-@])/, "") : "");
    const fail = (m: string) => errors.push({ line, message: m });

    // Numbers (empty = unchanged)
    const n = (c: Col, opts: { int?: boolean; nullable?: boolean } = {}): number | null | undefined => {
      const v = get(c);
      if (v === "") return undefined;
      if (opts.nullable && /^(-|none|null)$/i.test(v)) return null;
      const x = num(v);
      if (Number.isNaN(x) || x < 0 || (opts.int && !Number.isInteger(x))) {
        fail(`${c}: "${v}" is not a valid ${opts.int ? "whole number" : "number"}`);
        return undefined;
      }
      return x;
    };

    // Which product / option this row is about
    const vid = get("variant_id");
    const sku = get("sku");
    let product = byId.get(get("product_id")) ?? (get("slug") ? bySlug.get(slugify(get("slug"))) : undefined);
    let variant = vid ? variantById.get(vid)?.v : undefined;
    if (vid && !variant) return fail(`variant_id ${vid} not found`);
    if (!variant && sku && variantBySku.has(sku.toLowerCase())) {
      const hit = variantBySku.get(sku.toLowerCase())!;
      if (!product || product.id === hit.p.id) variant = hit.v;
    }
    if (variant) product = byId.get(variant.productId);
    if (get("product_id") && !product) return fail(`product_id ${get("product_id")} not found`);

    const size = get("size");
    const color = get("color");
    const name = get("name");
    const key = product ? product.id : `new:${slugify(get("slug") || name)}`;
    if (!product && !slugify(get("slug") || name)) return fail("A new product needs a name");

    let plan = plans.get(key);
    if (!plan) {
      plan = {
        key,
        label: product?.name ?? name,
        productId: product?.id,
        hasVariants: product ? product.variants.length > 0 : false,
        fields: {},
        units: [],
      };
      plans.set(key, plan);
    }

    // Product fields (the first row that sets one wins)
    const f = plan.fields;
    if (name && f.name === undefined) f.name = name.slice(0, 200);
    if (!product && get("slug") && f.slug === undefined) f.slug = slugify(get("slug"));
    if (get("description") && f.description === undefined) f.description = get("description");
    if (idx.has("category") && get("category") && f.categoryName === undefined) f.categoryName = get("category");
    const price = n("price");
    if (price != null && f.price === undefined) f.price = price;
    const cmp = n("compare_at", { nullable: true });
    if (cmp !== undefined && f.compareAt === undefined) f.compareAt = cmp;
    const cost = n("cost_price", { nullable: true });
    if (cost !== undefined && f.costPrice === undefined) f.costPrice = cost;
    const low = n("low_stock_at", { int: true, nullable: true });
    if (low !== undefined && f.lowStockAt === undefined) f.lowStockAt = low;
    if (get("published") && f.published === undefined) f.published = yes(get("published"));
    if (get("featured") && f.featured === undefined) f.featured = yes(get("featured"));
    if (idx.has("tags") && get("tags") && f.tags === undefined) {
      f.tags = [...new Set(get("tags").split(/[|,]/).map((t) => slugify(t)).filter(Boolean))].slice(0, 20);
    }
    if (get("images") && f.images === undefined) {
      const urls = get("images").split("|").map((u) => u.trim()).filter(Boolean);
      const bad = urls.find((u) => !/^https?:\/\//i.test(u));
      if (bad) fail(`images: "${bad}" is not a URL`);
      else f.images = urls.slice(0, 20);
    }

    // The unit (stock / option fields)
    const set: UnitSet = {};
    const stock = n("stock", { int: true });
    if (stock != null) set.stock = stock;
    const op = n("option_price", { nullable: true });
    if (op !== undefined) set.price = op;
    const oc = n("option_cost", { nullable: true });
    if (oc !== undefined) set.cost = oc;
    if (sku) set.sku = sku.slice(0, 64);

    if (variant) {
      plan.units.push({ line, variantId: variant.id, set });
    } else if (size || color) {
      const existing = product?.variants.find(
        (v) => v.size.toLowerCase() === size.toLowerCase() && v.color.toLowerCase() === color.toLowerCase(),
      );
      if (existing) plan.units.push({ line, variantId: existing.id, set });
      else plan.units.push({ line, create: { size: size.slice(0, 40), color: color.slice(0, 40) }, set });
      plan.hasVariants = true;
    } else {
      if (product && product.variants.length) {
        if (set.stock !== undefined || set.price !== undefined) {
          warnings.push({ line, message: `"${product.name}" has options: stock / option price on a product row is ignored` });
        }
      } else {
        plan.units.push({ line, set: { stock: set.stock } });
      }
    }
  });

  // New products must be complete and not mix option / no-option rows.
  for (const p of plans.values()) {
    if (p.productId) continue;
    const line = p.units[0]?.line ?? 0;
    if (!p.fields.name) errors.push({ line, message: `New product "${p.key.slice(4)}" needs a name` });
    if (p.fields.price == null) errors.push({ line, message: `New product "${p.label}" needs a price` });
    const withOpt = p.units.filter((u) => u.create || u.variantId).length;
    if (withOpt && withOpt !== p.units.length) {
      errors.push({ line, message: `"${p.label}": either every row has a size / colour, or none does` });
    }
  }

  const list = [...plans.values()];
  return {
    products: list,
    errors,
    warnings,
    summary: {
      updateProducts: list.filter((p) => p.productId).length,
      createProducts: list.filter((p) => !p.productId).length,
      createOptions: list.reduce((n, p) => n + p.units.filter((u) => u.create).length, 0),
      rows: rows.length,
    },
  };
}

/** Runs a checked plan: one transaction per product, stock changes logged as "CSV import". */
export async function applyImport(plan: ImportPlan, userId: string) {
  if (plan.errors.length) throw new Error("Fix the errors first");
  const cats = await prisma.category.findMany();
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
  async function categoryId(name: string | null | undefined): Promise<string | null | undefined> {
    if (name === undefined) return undefined;
    if (!name) return null;
    const hit = catByName.get(name.toLowerCase());
    if (hit) return hit;
    const slugBase = slugify(name) || "category";
    const taken = await prisma.category.findUnique({ where: { slug: slugBase }, select: { id: true } });
    const c = await prisma.category.upsert({
      where: { name },
      create: { name, slug: taken ? `${slugBase}-${Math.random().toString(36).slice(2, 6)}` : slugBase },
      update: {},
    });
    catByName.set(name.toLowerCase(), c.id);
    return c.id;
  }

  let done = 0;
  for (const p of plan.products) {
    const f = p.fields;
    const catId = await categoryId(f.categoryName);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let productId = p.productId;
      const before = await stockSnapshot(tx, productId ? [productId] : []);
      const fields: Prisma.ProductUncheckedUpdateInput = {
        ...(f.name !== undefined ? { name: f.name } : {}),
        ...(f.description !== undefined ? { description: f.description } : {}),
        ...(catId !== undefined ? { categoryId: catId } : {}),
        ...(f.price !== undefined ? { price: f.price } : {}),
        ...(f.compareAt !== undefined ? { compareAt: f.compareAt } : {}),
        ...(f.costPrice !== undefined ? { costPrice: f.costPrice } : {}),
        ...(f.lowStockAt !== undefined ? { lowStockAt: f.lowStockAt } : {}),
        ...(f.published !== undefined ? { published: f.published } : {}),
        ...(f.featured !== undefined ? { featured: f.featured } : {}),
        ...(f.tags !== undefined ? { tags: f.tags } : {}),
        ...(f.images !== undefined ? { images: f.images } : {}),
      };
      if (productId) {
        if (Object.keys(fields).length) await tx.product.update({ where: { id: productId }, data: fields });
      } else {
        let slug = f.slug || slugify(f.name!) || "product";
        if (await tx.product.findUnique({ where: { slug }, select: { id: true } })) {
          slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        }
        const created = await tx.product.create({
          data: {
            name: f.name!,
            slug,
            description: f.description || f.name!,
            price: f.price!,
            compareAt: f.compareAt ?? null,
            costPrice: f.costPrice ?? null,
            lowStockAt: f.lowStockAt ?? null,
            published: f.published ?? true,
            featured: f.featured ?? false,
            tags: f.tags ?? [],
            images: f.images ?? [],
            categoryId: catId ?? null,
            stock: 0,
          },
        });
        productId = created.id;
      }

      let position = await tx.productVariant.count({ where: { productId } });
      for (const u of p.units) {
        const s = u.set;
        const data = {
          ...(s.price !== undefined ? { price: s.price } : {}),
          ...(s.cost !== undefined ? { costPrice: s.cost } : {}),
          ...(s.sku !== undefined ? { sku: s.sku } : {}),
          ...(s.stock !== undefined ? { stock: s.stock } : {}),
        };
        if (u.variantId) {
          if (Object.keys(data).length) await tx.productVariant.update({ where: { id: u.variantId }, data });
        } else if (u.create) {
          await tx.productVariant.upsert({
            where: { productId_size_color: { productId: productId!, size: u.create.size, color: u.create.color } },
            create: { productId: productId!, size: u.create.size, color: u.create.color, position: position++, stock: 0, ...data },
            update: data,
          });
        } else if (s.stock !== undefined) {
          await tx.product.update({ where: { id: productId }, data: { stock: s.stock } });
        }
      }
      const agg = await tx.productVariant.aggregate({ where: { productId }, _sum: { stock: true }, _count: true });
      if (agg._count > 0) await tx.product.update({ where: { id: productId }, data: { stock: agg._sum.stock ?? 0 } });
      await logStockDiff(tx, before, [productId!], { reason: "import", userId });
    });
    done++;
  }
  return { products: done };
}
