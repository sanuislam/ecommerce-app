"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Download, FileUp, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Preview = {
  summary: { updateProducts: number; createProducts: number; createOptions: number; rows: number };
  errors: { line: number; message: string }[];
  warnings: { line: number; message: string }[];
  products: { label: string; action: "update" | "create"; options: number; rows: number; fields: string[] }[];
  applied?: number;
  error?: string;
};

const HELP: [string, string][] = [
  ["product_id / variant_id", "Keep them to update. Empty = a new product (or option)."],
  ["sku", "Also finds an option by its SKU."],
  ["size, color", "A row with a size or colour is one option of the product."],
  ["price, compare_at, cost_price", "Product prices. option_price / option_cost override them for one option."],
  ["stock", "Units in stock (the number is set, not added). Changes are logged as CSV import."],
  ["published, featured", "yes / no"],
  ["tags, images", "Separate several with |"],
  ["category", "Category name; a new name creates the category."],
];

export function ProductImport({ headers }: { headers: string[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"check" | "apply" | null>(null);

  async function send(text: string, apply: boolean) {
    setBusy(apply ? "apply" : "check");
    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text, apply }),
      });
      const data = (await res.json().catch(() => ({}))) as Preview & { error?: string };
      if (!res.ok && !data.summary) throw new Error(data.error ?? "Import failed");
      setPreview(data);
      if (data.error) toast.error(data.error);
      else if (apply && data.applied != null) {
        toast.success(`${data.applied} product(s) saved`);
        setCsv(null);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  function pick(f: File | undefined) {
    if (!f) return;
    if (f.size > 8_000_000) return toast.error("The file is larger than 8 MB");
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsv(text);
      setPreview(null);
      void send(text, false);
    };
    reader.readAsText(f, "utf-8");
  }

  const template = "﻿" + headers.join(",") + "\r\n";

  return (
    <div className="grid gap-6">
      <section className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
        <Button asChild variant="outline">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a file download, not a page */}
          <a href="/api/admin/products/export">
            <Download className="size-4" /> Export all products
          </a>
        </Button>
        <Button asChild variant="ghost">
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="products-template.csv">
            <Download className="size-4" /> Empty template
          </a>
        </Button>
      </section>

      <section
        className="rounded-xl border-2 border-dashed bg-card p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
      >
        <FileUp className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm">{fileName ? fileName : "Drop a CSV file here, or"}</p>
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="outline" className="mt-3" onClick={() => input.current?.click()} disabled={!!busy}>
          {busy === "check" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Choose file
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Nothing is saved until you press Import.</p>
      </section>

      {preview && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Check</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {preview.summary.rows} rows · {preview.summary.updateProducts} products to update ·{" "}
            {preview.summary.createProducts} new products · {preview.summary.createOptions} new options
          </p>
          {preview.errors.length > 0 && (
            <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {preview.errors.map((e, i) => (
                <li key={i}>
                  Row {e.line}: {e.message}
                </li>
              ))}
            </ul>
          )}
          {preview.warnings.length > 0 && (
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              {preview.warnings.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Row {w.line}: {w.message}
                </li>
              ))}
            </ul>
          )}
          {preview.products.length > 0 && (
            <ul className="mt-3 max-h-72 divide-y overflow-y-auto rounded-lg border text-sm">
              {preview.products.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-2.5">
                  <span className="min-w-0 truncate">{p.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs",
                      p.action === "create" ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-muted",
                    )}
                  >
                    {p.action === "create" ? "New" : "Update"}
                    {p.options ? ` · ${p.options} new option(s)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {preview.applied != null ? (
            <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">Imported {preview.applied} product(s).</p>
          ) : (
            <div className="mt-4 flex justify-end">
              <Button onClick={() => csv && void send(csv, true)} disabled={!csv || !!busy || preview.errors.length > 0}>
                {busy === "apply" && <Loader2 className="size-4 animate-spin" />} Import
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Columns</h2>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-[220px_1fr]">
          {HELP.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-xs">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
