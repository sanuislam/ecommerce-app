"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PhotoPicker } from "@/components/photo-picker";

export type ReturnableItem = {
  orderItemId: string;
  name: string;
  variantName: string | null;
  variantId: string | null;
  image: string | null;
  available: number;
  /** Other options of the same product (for an exchange). */
  options: { id: string; label: string; stock: number }[];
};

/** Customer (or admin) form to ask for a return or an exchange. */
export function ReturnRequestButton({
  orderId,
  items,
  reasons,
  admin = false,
  until,
  photos = false,
}: {
  orderId: string;
  items: ReturnableItem[];
  reasons: readonly string[];
  admin?: boolean;
  until?: string | null;
  /** Let the customer add photos of the items (needs Cloudinary). */
  photos?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [swap, setSwap] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<string>(reasons[0]);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const chosen = items.filter((i) => (qty[i.orderItemId] ?? 0) > 0);

  async function submit() {
    if (!chosen.length) return toast.error("Choose at least one item");
    setBusy(true);
    try {
      const res = await fetch(admin ? "/api/admin/returns" : `/api/orders/${orderId}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(admin ? { orderId } : {}),
          type,
          reason,
          note,
          ...(admin ? {} : { images }),
          items: chosen.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: qty[i.orderItemId],
            exchangeVariantId: type === "EXCHANGE" ? swap[i.orderItemId] || i.variantId : null,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send the request");
      toast.success(admin ? "Return opened" : "Request sent. We'll get back to you soon.");
      setOpen(false);
      setQty({});
      setNote("");
      setImages([]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size={admin ? "sm" : "default"} onClick={() => setOpen(true)}>
        <Undo2 className="size-4" /> {admin ? "Open a return" : "Return or exchange"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Return or exchange</DialogTitle>
            <DialogDescription>
              {until ? `You can ask until ${until}. ` : ""}Choose the items and tell us what went wrong.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Request type">
            {(
              [
                ["RETURN", "Return for a refund"],
                ["EXCHANGE", "Exchange for another size / colour"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={type === v}
                onClick={() => setType(v)}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm",
                  type === v ? "border-primary bg-brand-50/70 font-medium" : "hover:border-brand-300",
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <ul className="divide-y rounded-lg border">
            {items.map((i) => {
              const n = qty[i.orderItemId] ?? 0;
              return (
                <li key={i.orderItemId} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="line-clamp-1 font-medium">{i.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {i.variantName ? `${i.variantName} · ` : ""}
                        {i.available > 0 ? `up to ${i.available}` : "already requested"}
                      </span>
                    </span>
                    <span className="flex items-center rounded-lg border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Fewer"
                        disabled={n <= 0}
                        onClick={() => setQty((q) => ({ ...q, [i.orderItemId]: Math.max(0, n - 1) }))}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm tabular-nums">{n}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="More"
                        disabled={n >= i.available}
                        onClick={() => setQty((q) => ({ ...q, [i.orderItemId]: Math.min(i.available, n + 1) }))}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </span>
                  </div>
                  {type === "EXCHANGE" && n > 0 && i.options.length > 0 && (
                    <Label className="mt-2 grid gap-1 text-xs">
                      Exchange for
                      <select
                        className="h-9 rounded-lg border bg-background px-2 text-sm"
                        value={swap[i.orderItemId] ?? i.variantId ?? ""}
                        onChange={(e) => setSwap((s) => ({ ...s, [i.orderItemId]: e.target.value }))}
                      >
                        {i.options.map((o) => (
                          <option key={o.id} value={o.id} disabled={o.stock <= 0 && o.id !== i.variantId}>
                            {o.label}
                            {o.id === i.variantId ? " (same)" : o.stock <= 0 ? " (out of stock)" : ""}
                          </option>
                        ))}
                      </select>
                    </Label>
                  )}
                </li>
              );
            })}
          </ul>

          <Label className="grid gap-1.5 text-sm">
            Reason
            <select
              className="h-9 rounded-lg border bg-background px-2 text-sm font-normal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {reasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Label>
          <Label className="grid gap-1.5 text-sm">
            <span>
              Details <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Label>
          {photos && !admin ? (
            <div className="grid gap-1.5 text-sm">
              <span className="font-medium">
                Photos <span className="font-normal text-muted-foreground">(optional — helps us decide faster)</span>
              </span>
              <PhotoPicker kind="return" value={images} onChange={setImages} />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Close
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !chosen.length}>
              {busy && <Loader2 className="size-4 animate-spin" />} {admin ? "Open return" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "Withdraw" for a request the shop hasn't looked at yet. */
export function CancelReturnButton({ orderId, returnId }: { orderId: string; returnId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Withdraw this request?")) return;
        setBusy(true);
        const res = await fetch(`/api/orders/${orderId}/returns?rid=${encodeURIComponent(returnId)}`, { method: "DELETE" });
        setBusy(false);
        if (res.ok) {
          toast.success("Request withdrawn");
          router.refresh();
        } else toast.error("Could not withdraw the request");
      }}
    >
      Withdraw
    </Button>
  );
}
