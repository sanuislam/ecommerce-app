"use client";

import axios from "axios";
import { useState } from "react";
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
  published: boolean;
  categoryId: string | null;
};

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
      published: true,
      categoryId: null,
    },
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ProductInput>(k: K, v: ProductInput[K]) {
    setData((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...data,
        slug: data.slug || slugify(data.name),
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
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
            min="0"
            required
            value={data.stock}
            onChange={(e) => set("stock", parseInt(e.target.value || "0", 10))}
          />
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
              onCheckedChange={(v) => set("flashDeal", Boolean(v))}
            />
            <Label htmlFor="flashDeal">Flash deal</Label>
          </div>
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
      <div className="flex justify-end gap-2">
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
