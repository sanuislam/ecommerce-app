"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Percent, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { cn } from "@/lib/utils";

export type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  price: string;
  stock: number;
  options: number;
  low: boolean;
  published: boolean;
  featured: boolean;
  tags: string[];
};

/** Products list with selection and bulk changes. */
export function ProductsTable({ rows, categories }: { rows: ProductRow[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState("");
  const [tag, setTag] = useState("");
  const ids = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const chosen = [...selected].filter((id) => ids.has(id));
  const allOn = rows.length > 0 && chosen.length === rows.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  async function bulk(body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: chosen, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; updated?: number };
      if (!res.ok) throw new Error(data.error ?? "Could not update");
      toast.success(`${data.updated ?? chosen.length} product(s) ${done}`);
      setPct("");
      setTag("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOn ? true : chosen.length ? "indeterminate" : false}
                  onCheckedChange={(v) => setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set())}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => toggle(p.id, v === true)} aria-label={`Select ${p.name}`} />
                  </TableCell>
                  <TableCell className="max-w-64" title={p.name}>
                    <div className="truncate font-medium">{p.name}</div>
                    {p.tags.length > 0 && <div className="truncate text-xs text-muted-foreground">{p.tags.map((t) => `#${t}`).join(" ")}</div>}
                  </TableCell>
                  <TableCell>{p.category ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{p.price}</TableCell>
                  <TableCell className={cn("tabular-nums", p.stock <= 0 ? "text-destructive" : p.low ? "text-amber-700 dark:text-amber-400" : "")}>
                    {p.stock}
                    {p.options > 0 && <span className="ml-1 text-xs text-muted-foreground">({p.options} options)</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.published ? "default" : "secondary"}>{p.published ? "Published" : "Draft"}</Badge>
                    {p.featured && (
                      <Badge className="ml-1" variant="outline">
                        Featured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                      </Button>
                      <DeleteProductButton id={p.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {chosen.length > 0 && (
        <div className="sticky bottom-3 z-30 mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2.5 shadow-lg backdrop-blur">
          <span className="px-1 text-sm font-medium tabular-nums">{chosen.length} selected</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setSelected(new Set())} aria-label="Clear selection">
            <X className="size-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void bulk({ action: "publish", value: true }, "published")}>
            <Eye className="size-4" /> Publish
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void bulk({ action: "publish", value: false }, "hidden")}>
            <EyeOff className="size-4" /> Hide
          </Button>
          <select
            aria-label="Move to category"
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && void bulk({ action: "category", categoryId: e.target.value === "none" ? null : e.target.value }, "moved")}
          >
            <option value="">Move to category…</option>
            <option value="none">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="flex items-center gap-1">
            <Input className="h-8 w-20" inputMode="decimal" placeholder="±%" value={pct} onChange={(e) => setPct(e.target.value)} aria-label="Price change %" />
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !Number(pct)}
              onClick={() => {
                if (!confirm(`Change prices (and option prices) by ${Number(pct)}%? Rounded to whole taka.`)) return;
                void bulk({ action: "price", percent: Number(pct) }, "repriced");
              }}
            >
              <Percent className="size-4" /> Price
            </Button>
          </span>
          <span className="flex items-center gap-1">
            <Input className="h-8 w-28" placeholder="tag" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag" />
            <Button size="sm" variant="outline" disabled={busy || !tag.trim()} onClick={() => void bulk({ action: "tag", tag, add: true }, "tagged")}>
              <Tag className="size-4" /> Add
            </Button>
            <Button size="sm" variant="ghost" disabled={busy || !tag.trim()} onClick={() => void bulk({ action: "tag", tag, add: false }, "untagged")}>
              Remove
            </Button>
          </span>
          {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      )}
    </>
  );
}
