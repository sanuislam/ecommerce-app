"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DemoCatalogCard({ productCount }: { productCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"load" | "remove" | null>(null);

  async function run(method: "POST" | "DELETE") {
    setBusy(method === "POST" ? "load" : "remove");
    try {
      const res = await fetch("/api/admin/demo-products", { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(
        method === "POST"
          ? `Demo catalogue loaded: ${data.created} new, ${data.updated} refreshed`
          : `Removed ${data.removed} demo products${data.hidden ? ` (${data.hidden} with orders were hidden)` : ""}`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Demo products</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill the shop with 48 sample products in 11 Eid categories (panjabi, saree, abaya,
        attar, prayer essentials…) with photos, prices and size options. Safe to run again.
        Your store currently has {productCount} product{productCount === 1 ? "" : "s"}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => run("POST")} disabled={busy !== null}>
          <PackagePlus className="size-4" />
          {busy === "load" ? "Loading..." : "Load demo products"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive" disabled={busy !== null}>
              <Trash2 className="size-4" />
              {busy === "remove" ? "Removing..." : "Remove demo products"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove all demo products?</AlertDialogTitle>
              <AlertDialogDescription>
                Demo products that were never ordered are deleted; ones with orders are hidden
                instead. Your own products are not touched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => run("DELETE")}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
