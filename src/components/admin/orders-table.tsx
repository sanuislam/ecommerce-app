"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Loader2, Package, Truck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma";
import { CourierBookDialog } from "@/components/admin/courier-book-dialog";
import { RiskBadge, type RiskView } from "@/components/admin/order-cod-card";
import { orderNo } from "@/lib/order-number";

export type OrderRow = {
  id: string;
  number: number;
  customer: string;
  phone: string;
  place: string;
  items: number;
  total: string;
  status: OrderStatus;
  statusLabel: string;
  placed: string;
  method: string;
  paid: boolean;
  source: string | null;
  courier: string | null;
  consignment: string | null;
  courierStatus: string | null;
  risk: RiskView | null;
  needsCall: boolean;
};

function statusVariant(s: OrderStatus) {
  if (s === "PAID" || s === "DELIVERED") return "default" as const;
  if (s === "CANCELLED" || s === "REFUNDED") return "destructive" as const;
  return "secondary" as const;
}

const BULK_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "PAID", label: "Payment confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const COURIER_LABEL: Record<string, string> = { steadfast: "Steadfast", pathao: "Pathao", redx: "RedX" };

export function OrdersTable({ rows, empty }: { rows: OrderRow[]; empty: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

  // Rows that left the page (new page, refresh) drop out of the selection.
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
  const toggleAll = (on: boolean) => setSelected(on ? new Set(rows.map((r) => r.id)) : new Set());

  async function bulkStatus(status: OrderStatus, label: string) {
    if (!chosen.length || busy) return;
    if (!confirm(`Mark ${chosen.length} order(s) as "${label}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: chosen, action: "status", status }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        done?: number;
        failed?: { id: string; error?: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Bulk update failed");
      if (data.done) toast.success(`${data.done} order(s) updated`);
      if (data.failed?.length) {
        toast.error(
          `${data.failed.length} not changed: ${data.failed
            .slice(0, 3)
            .map((f) => `#${f.id.slice(0, 8)} – ${f.error}`)
            .join("; ")}`,
          { duration: 10_000 },
        );
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBusy(false);
    }
  }

  const openPrint = (type: "invoice" | "slip") =>
    window.open(`/print/orders?type=${type}&ids=${chosen.join(",")}`, "_blank", "noopener");

  return (
    <>
      {/* Phones: cards */}
      <ul className="mt-4 space-y-2 sm:hidden">
        {rows.length === 0 ? (
          <li className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">{empty}</li>
        ) : (
          rows.map((o) => (
            <li key={o.id} className="flex gap-3 rounded-lg border bg-card p-3">
              <Checkbox
                className="mt-1"
                checked={selected.has(o.id)}
                onCheckedChange={(v) => toggle(o.id, v === true)}
                aria-label={`Select order ${orderNo(o)}`}
              />
              <Link href={`/admin/orders/${o.id}`} className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{orderNo(o)}</span>
                  <Badge variant={statusVariant(o.status)}>{o.statusLabel}</Badge>
                </div>
                <div className="mt-1 truncate text-sm">
                  {o.customer} <span className="text-muted-foreground">{o.phone}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <RiskBadge risk={o.risk} />
                  {o.needsCall && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-900 dark:text-amber-200">
                      Not confirmed
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    {o.placed} · {o.method}
                  </span>
                  <span className="shrink-0 font-semibold">{o.total}</span>
                </div>
                {o.courier && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {COURIER_LABEL[o.courier] ?? o.courier} {o.consignment}
                    {o.courierStatus ? ` · ${o.courierStatus}` : ""}
                  </div>
                )}
              </Link>
            </li>
          ))
        )}
      </ul>

      {/* Tablet and up: table */}
      <div className="mt-4 hidden overflow-x-auto rounded-lg border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOn ? true : chosen.length ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Courier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => (
                <TableRow key={o.id} data-state={selected.has(o.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(o.id)}
                      onCheckedChange={(v) => toggle(o.id, v === true)}
                      aria-label={`Select order ${orderNo(o)}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      {orderNo(o)}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {o.placed}
                      {o.source && <span> · {o.source}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <div className="truncate">{o.customer}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[o.phone, o.place].filter(Boolean).join(" · ")}
                    </div>
                    <RiskBadge risk={o.risk} className="mt-1" />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium tabular-nums">{o.total}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.items} item{o.items === 1 ? "" : "s"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{o.method}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(o.status)}>{o.statusLabel}</Badge>
                    {o.needsCall && (
                      <div className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">Not confirmed</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.courier ? (
                      <>
                        <div>{COURIER_LABEL[o.courier] ?? o.courier}</div>
                        <div className="max-w-40 truncate text-xs text-muted-foreground">
                          {o.courierStatus || o.consignment}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk action bar */}
      {chosen.length > 0 && (
        <div className="sticky bottom-3 z-30 mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2.5 shadow-lg backdrop-blur">
          <span className="px-1 text-sm font-medium tabular-nums">{chosen.length} selected</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setSelected(new Set())} aria-label="Clear selection">
            <X className="size-4" />
          </Button>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Button size="sm" onClick={() => setBookOpen(true)} disabled={busy}>
            <Truck className="size-4" /> Book courier
          </Button>
          <select
            aria-label="Change status"
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value=""
            disabled={busy}
            onChange={(e) => {
              const s = BULK_STATUSES.find((b) => b.value === e.target.value);
              if (s) void bulkStatus(s.value, s.label);
            }}
          >
            <option value="">Mark as…</option>
            {BULK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => openPrint("invoice")}>
            <FileText className="size-4" /> Invoices
          </Button>
          <Button size="sm" variant="outline" onClick={() => openPrint("slip")}>
            <Package className="size-4" /> Packing slips
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/admin/orders/export?ids=${chosen.join(",")}`}>
              <Download className="size-4" /> CSV
            </a>
          </Button>
          {busy && <Loader2 className={cn("size-4 animate-spin text-muted-foreground")} />}
        </div>
      )}

      <CourierBookDialog
        open={bookOpen}
        onOpenChange={setBookOpen}
        orderIds={chosen}
        onDone={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />
    </>
  );
}
