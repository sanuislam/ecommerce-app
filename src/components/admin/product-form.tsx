"use client";

import axios from "axios";
import { useMemo, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/admin/image-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/generated/prisma";
import { slugify } from "@/lib/utils";

type ProductInput = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAt?: number | null;
  stock: number;
  images: string[];
  featured: boolean;
  flashDeal: boolean;
  flashDealDiscount: number | null;
  published: boolean;
  categoryId: string | null;
  costPrice?: number | null;
  lowStockAt?: number | null;
  tags?: string[];
  variants?: VariantInput[];
};

export type VariantInput = {
  id?: string;
  size: string;
  color: string;
  price: number | null;
  stock: number;
  stockBase?: number;
  sku?: string | null;
  costPrice?: number | null;
};

type VariantRow = {
  key: string;
  id?: string;
  /** Stock when the form loaded — the server applies the change as a delta. */
  stockBase?: number;
  size: string;
  color: string;
  price: string;
  stock: string;
  sku: string;
  cost: string;
};

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}`;

function toRow(v: VariantInput): VariantRow {
  return {
    key: v.id ?? newKey(),
    id: v.id,
    stockBase: v.id ? v.stock : undefined,
    size: v.size,
    color: v.color,
    price: v.price == null ? "" : String(v.price),
    stock: String(v.stock),
    sku: v.sku ?? "",
    cost: v.costPrice == null ? "" : String(v.costPrice),
  };
}

const splitList = (s: string) =>
  Array.from(new Set(s.split(",").map((x) => x.trim()).filter(Boolean)));

export function ProductForm({
  categories,
  initial,
}: {
  categories: Category[];
  initial?: ProductInput;
}) {
  const router = useRouter();
  const [data, setData] = useState<ProductInput>(
    initial ?? {
      name: "",
      slug: "",
      description: "",
      price: 0,
      compareAt: null,
      stock: 0,
      images: [],
      featured: false,
      flashDeal: false,
      flashDealDiscount: null,
      published: true,
      categoryId: null,
    },
  );
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<VariantRow[]>(
    () => initial?.variants?.map(toRow) ?? [],
  );
  const [genSizes, setGenSizes] = useState("");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [genColors, setGenColors] = useState("");

  const hasVariants = rows.length > 0;
  const variantStock = useMemo(
    () => rows.reduce((sum, r) => sum + (parseInt(r.stock, 10) || 0), 0),
    [rows],
  );

  function updateRow(key: string, patch: Partial<VariantRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: newKey(), size: "", color: "", price: "", stock: "0", sku: "", cost: "" },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function generateRows() {
    const sizes = splitList(genSizes);
    const colors = splitList(genColors);
    if (!sizes.length && !colors.length) {
      toast.error("Enter sizes and/or colours separated by commas");
      return;
    }
    const combos: Array<{ size: string; color: string }> = [];
    for (const size of sizes.length ? sizes : [""]) {
      for (const color of colors.length ? colors : [""]) {
        combos.push({ size, color });
      }
    }
    const k = (size: string, color: string) =>
      `${size.toLowerCase()}\u0000${color.toLowerCase()}`;
    const existing = new Set(rows.map((r) => k(r.size.trim(), r.color.trim())));
    const added = combos
      .filter((c) => !existing.has(k(c.size, c.color)))
      .map((c) => ({
        key: newKey(),
        size: c.size,
        color: c.color,
        price: "",
        stock: "0",
        sku: "",
        cost: "",
      }));
    if (added.length === 0) {
      toast.info("Those options already exist");
      return;
    }
    setRows([...rows, ...added]);
    setGenSizes("");
    setGenColors("");
  }

  function buildVariants(): VariantInput[] | string {
    const out: VariantInput[] = [];
    const seen = new Set<string>();
    for (const [i, r] of rows.entries()) {
      const size = r.size.trim();
      const color = r.color.trim();
      const label = `Option ${i + 1}`;
      if (!size && !color) return `${label}: enter a size or a colour`;
      const key = `${size.toLowerCase()}\u0000${color.toLowerCase()}`;
      if (seen.has(key)) return `${label}: duplicate of another option`;
      seen.add(key);
      const stock = r.stock.trim() === "" ? 0 : Number(r.stock);
      if (!Number.isInteger(stock) || stock < 0)
        return `${label}: stock must be a whole number ≥ 0`;
      let price: number | null = null;
      if (r.price.trim() !== "") {
        price = Number(r.price);
        if (!Number.isFinite(price) || price < 0)
          return `${label}: price must be a number ≥ 0`;
      }
      let costPrice: number | null = null;
      if (r.cost.trim() !== "") {
        costPrice = Number(r.cost);
        if (!Number.isFinite(costPrice) || costPrice < 0) return `${label}: cost must be a number ≥ 0`;
      }
      out.push({ id: r.id, size, color, price, stock, stockBase: r.stockBase, sku: r.sku.trim() || null, costPrice });
    }
    return out;
  }

  function set<K extends keyof ProductInput>(k: K, v: ProductInput[K]) {
    setData((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (data.flashDeal) {
      const d = data.flashDealDiscount;
      if (d == null || !Number.isInteger(d) || d < 1 || d > 99) {
        toast.error("Flash deal discount must be 1-99 when Flash deal is on");
        return;
      }
    }
    const variants = buildVariants();
    if (typeof variants === "string") {
      toast.error(variants);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        stock: variants.length ? variantStock : data.stock,
        stockBase: initial?.id && !variants.length ? initial.stock : undefined,
        variants,
        flashDealDiscount: data.flashDeal ? data.flashDealDiscount : null,
        slug: data.slug || slugify(data.name),
        tags: splitList(tagsText.toLowerCase()),
        images: data.images.map((s) => s.trim()).filter(Boolean),
      };
      if (initial?.id) {
        await axios.patch(`/api/admin/products/${initial.id}`, payload);
        toast.success("Product updated");
      } else {
        await axios.post("/api/admin/products", payload);
        toast.success("Product created");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            required
            value={data.name}
            onChange={(e) => {
              const name = e.target.value;
              set("name", name);
              if (!initial?.slug) set("slug", slugify(name));
            }}
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={data.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={data.categoryId ?? "__none__"}
            onValueChange={(v) => set("categoryId", v === "__none__" ? null : v)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No category</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            required
            value={data.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            required
            value={data.price}
            onChange={(e) => set("price", parseFloat(e.target.value || "0"))}
          />
        </div>
        <div>
          <Label htmlFor="compareAt">Compare at (optional)</Label>
          <Input
            id="compareAt"
            type="number"
            step="0.01"
            min="0"
            value={data.compareAt ?? ""}
            onChange={(e) =>
              set(
                "compareAt",
                e.target.value === "" ? null : parseFloat(e.target.value),
              )
            }
          />
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            inputMode="numeric"
            min="0"
            required
            disabled={hasVariants}
            value={hasVariants ? variantStock : data.stock}
            onChange={(e) => set("stock", parseInt(e.target.value || "0", 10))}
          />
          {hasVariants && (
            <p className="mt-1 text-xs text-muted-foreground">
              Total of all options below.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="costPrice">Cost price (optional)</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="What one unit costs you"
            value={data.costPrice ?? ""}
            onChange={(e) => set("costPrice", e.target.value === "" ? null : parseFloat(e.target.value))}
          />
          <p className="mt-1 text-xs text-muted-foreground">Never shown to customers. Used for profit.</p>
        </div>
        <div>
          <Label htmlFor="lowStockAt">Low stock warning at</Label>
          <Input
            id="lowStockAt"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Shop default"
            value={data.lowStockAt ?? ""}
            onChange={(e) => set("lowStockAt", e.target.value === "" ? null : parseInt(e.target.value, 10))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="tags">Tags (optional)</Label>
          <Input
            id="tags"
            placeholder="eid-2026, new, cotton"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Comma separated. A tag works as a collection: /products?tag=eid-2026
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="featured"
              checked={data.featured}
              onCheckedChange={(v) => set("featured", Boolean(v))}
            />
            <Label htmlFor="featured">Featured</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="flashDeal"
              checked={data.flashDeal}
              onCheckedChange={(v) => {
                const next = Boolean(v);
                set("flashDeal", next);
                if (!next) set("flashDealDiscount", null);
              }}
            />
            <Label htmlFor="flashDeal">Flash deal</Label>
          </div>
          {data.flashDeal && (
            <div className="flex items-center gap-2">
              <Label htmlFor="flashDealDiscount" className="text-xs text-muted-foreground">
                Discount %
              </Label>
              <Input
                id="flashDealDiscount"
                type="number"
                min={1}
                max={99}
                step={1}
                required
                value={data.flashDealDiscount ?? ""}
                onChange={(e) =>
                  set(
                    "flashDealDiscount",
                    e.target.value === "" ? null : parseInt(e.target.value, 10),
                  )
                }
                className="h-9 w-20"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              id="published"
              checked={data.published}
              onCheckedChange={(v) => set("published", Boolean(v))}
            />
            <Label htmlFor="published">Published</Label>
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label>Options (size / colour)</Label>
              <p className="text-xs text-muted-foreground">
                Optional. Leave price empty to use the product price. When options
                exist, stock is tracked per option.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-4" /> Add option
            </Button>
          </div>

          <div className="mt-3 grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="gen-sizes" className="text-xs">
                Sizes
              </Label>
              <Input
                id="gen-sizes"
                placeholder="S, M, L, XL"
                value={genSizes}
                onChange={(e) => setGenSizes(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="gen-colors" className="text-xs">
                Colours
              </Label>
              <Input
                id="gen-colors"
                placeholder="Red, Black"
                value={genColors}
                onChange={(e) => setGenColors(e.target.value)}
              />
            </div>
            <Button type="button" variant="secondary" onClick={generateRows}>
              <Wand2 className="size-4" /> Generate
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_6.5rem_6.5rem_5.5rem_1fr_2.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
                <span>Size</span>
                <span>Colour</span>
                <span>Price (opt.)</span>
                <span>Cost (opt.)</span>
                <span>Stock</span>
                <span>SKU (opt.)</span>
                <span className="sr-only">Remove</span>
              </div>
              {rows.map((r, i) => (
                <div
                  key={r.key}
                  className="grid grid-cols-2 gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_6.5rem_6.5rem_5.5rem_1fr_2.5rem] md:items-center md:border-0 md:p-1"
                >
                  <div className="col-span-2 flex items-center justify-between md:hidden">
                    <span className="text-xs font-medium text-muted-foreground">
                      Option {i + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove option ${i + 1}`}
                      onClick={() => removeRow(r.key)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    aria-label="Size"
                    placeholder="Size"
                    value={r.size}
                    onChange={(e) => updateRow(r.key, { size: e.target.value })}
                  />
                  <Input
                    aria-label="Colour"
                    placeholder="Colour"
                    value={r.color}
                    onChange={(e) => updateRow(r.key, { color: e.target.value })}
                  />
                  <Input
                    aria-label="Price override"
                    placeholder={`৳${data.price || 0}`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={r.price}
                    onChange={(e) => updateRow(r.key, { price: e.target.value })}
                  />
                  <Input
                    aria-label="Cost"
                    placeholder={data.costPrice != null ? `৳${data.costPrice}` : "Cost"}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={r.cost}
                    onChange={(e) => updateRow(r.key, { cost: e.target.value })}
                  />
                  <Input
                    aria-label="Stock"
                    placeholder="Stock"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    value={r.stock}
                    onChange={(e) => updateRow(r.key, { stock: e.target.value })}
                  />
                  <Input
                    aria-label="SKU"
                    placeholder="SKU"
                    className="col-span-2 md:col-span-1"
                    value={r.sku}
                    onChange={(e) => updateRow(r.key, { sku: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden md:inline-flex"
                    aria-label={`Remove option ${i + 1}`}
                    onClick={() => removeRow(r.key)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label>Product images</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            First image is used as the cover. Drag images to reorder, or paste a
            URL to add an image hosted elsewhere.
          </p>
          <ImageUploader
            value={data.images}
            onChange={(next) => set("images", next)}
            disabled={saving}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : initial ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
