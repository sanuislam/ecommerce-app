"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History, Loader2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatPrice } from "@/lib/utils";

export type StockRow = {
  productId: string;
  variantId: string | null;
  name: string;
  option: string | null;
  sku: string | null;
  image: string | null;
  stock: number;
  threshold: number;
  cost: number | null;
  price: number;
  published: boolean;
};

export function StockTable({ rows, empty }: { rows: StockRow[]; empty: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<StockRow | null>(null);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function open(r: StockRow) {
    setEditing(r);
    setMode("add");
    setAmount("");
    setNote("");
  }

  async function save() {
    if (!editing) return;
    const n = Number(amount);
    if (!Number.isInteger(n)) return toast.error("Enter a whole number");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: editing.productId, variantId: editing.variantId, mode, amount: n, note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; stock?: number };
      if (!res.ok) throw new Error(data.error ?? "Could not adjust");
      toast.success(`Stock is now ${data.stock}`);
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not adjust");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 text-right font-medium">In stock</th>
                <th className="hidden p-3 text-right font-medium sm:table-cell">Warn at</th>
                <th className="hidden p-3 text-right font-medium md:table-cell">Cost</th>
                <th className="hidden p-3 text-right font-medium md:table-cell">Price</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={`${r.productId}:${r.variantId ?? ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="relative hidden size-10 shrink-0 overflow-hidden rounded-md border bg-muted sm:block">
                        {r.image && <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <Link href={`/admin/products/${r.productId}/edit`} className="line-clamp-1 font-medium hover:underline">
                          {r.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {[r.option, r.sku].filter(Boolean).join(" · ") || "—"}
                          {!r.published && " · hidden"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "p-3 text-right font-semibold tabular-nums",
                      r.stock <= 0 ? "text-destructive" : r.stock <= r.threshold ? "text-amber-700 dark:text-amber-400" : "",
                    )}
                  >
                    {r.stock}
                  </td>
                  <td className="hidden p-3 text-right text-muted-foreground tabular-nums sm:table-cell">{r.threshold}</td>
                  <td className="hidden p-3 text-right text-muted-foreground tabular-nums md:table-cell">
                    {r.cost != null ? formatPrice(r.cost) : "—"}
                  </td>
                  <td className="hidden p-3 text-right tabular-nums md:table-cell">{formatPrice(r.price)}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => open(r)}>
                      <PackagePlus className="size-4" /> Adjust
                    </Button>
                    <Button asChild size="icon-sm" variant="ghost" aria-label="Stock history">
                      <Link href={`/admin/inventory?view=history&product=${r.productId}`}>
                        <History className="size-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !busy && !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {editing?.name}
              {editing?.option ? ` · ${editing.option}` : ""} — now {editing?.stock}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kind">
            {(
              [
                ["add", "Add or remove"],
                ["set", "Set counted stock"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={mode === v}
                onClick={() => setMode(v)}
                className={cn("rounded-lg border p-2 text-sm", mode === v ? "border-foreground bg-muted/50 font-medium" : "")}
              >
                {l}
              </button>
            ))}
          </div>
          <Label className="grid gap-1.5 text-sm">
            {mode === "add" ? "Change (use − to remove, e.g. −2)" : "Units counted"}
            <Input inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))} />
          </Label>
          <Label className="grid gap-1.5 text-sm">
            Reason
            <Input placeholder="New shipment, damaged, stock count…" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          </Label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || amount === "" || amount === "-"}>
              {busy && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
