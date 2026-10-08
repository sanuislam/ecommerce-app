"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, PackageCheck, RefreshCw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status = "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "COMPLETED" | "CANCELLED";

/** The next steps of a return / exchange, one panel. */
export function ReturnActions({
  id,
  type,
  status,
  restocked,
  refunded,
  suggestedRefund,
  refundLeft,
  gateway,
  methods,
  replacementOrderId,
}: {
  id: string;
  type: "RETURN" | "EXCHANGE";
  status: Status;
  restocked: boolean;
  refunded: { amount: string; method: string; reference: string | null } | null;
  suggestedRefund: number;
  refundLeft: number;
  gateway: "bKash" | "Upay" | null;
  methods: string[];
  replacementOrderId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(true);
  const [amount, setAmount] = useState(suggestedRefund ? String(suggestedRefund) : "");
  const [viaGateway, setViaGateway] = useState(!!gateway);
  const [method, setMethod] = useState(methods[0]);
  const [reference, setReference] = useState("");
  const [charge, setCharge] = useState("0");

  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(String(body.action));
    try {
      const res = await fetch(`/api/admin/returns/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; orderId?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  const spin = (a: string) => (busy === a ? <Loader2 className="size-4 animate-spin" /> : null);
  const done = status === "REJECTED" || status === "CANCELLED" || status === "COMPLETED";

  return (
    <div className="space-y-4">
      {status === "REQUESTED" && (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="font-semibold">Review the request</h3>
          <Textarea className="mt-2" rows={2} maxLength={300} placeholder="Note to the customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="sm" disabled={!!busy} onClick={() => void act({ action: "approve", note }, "Approved")}>
              {spin("approve") ?? <Check className="size-4" />} Approve
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void act({ action: "reject", note }, "Rejected")}>
              {spin("reject") ?? <X className="size-4" />} Reject
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">The customer gets an SMS either way (when SMS is on).</p>
        </section>
      )}

      {status === "APPROVED" && (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <PackageCheck className="size-4" /> Item came back
          </h3>
          <label className="mt-2 flex items-center gap-2">
            <Checkbox checked={restock} onCheckedChange={(v) => setRestock(v === true)} />
            Put the items back in stock
          </label>
          <Button size="sm" className="mt-2 w-full" disabled={!!busy} onClick={() => void act({ action: "receive", restock }, "Marked as received")}>
            {spin("receive")} Mark as received
          </Button>
        </section>
      )}

      {type === "RETURN" && (status === "APPROVED" || status === "RECEIVED") && !refunded && (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <Undo2 className="size-4" /> Refund
          </h3>
          <div className="mt-2 grid gap-2">
            <Label className="grid gap-1 text-xs">
              Amount (৳) · up to {refundLeft.toFixed(2)}
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Label>
            {gateway && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={viaGateway} onCheckedChange={(v) => setViaGateway(v === true)} />
                Send it back through {gateway} automatically
              </label>
            )}
            {!viaGateway && (
              <div className="grid grid-cols-2 gap-2">
                <Label className="grid gap-1 text-xs">
                  Paid by
                  <select className="h-9 rounded-lg border bg-background px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {methods.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Label>
                <Label className="grid gap-1 text-xs">
                  TrxID / reference
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                </Label>
              </div>
            )}
            <Button
              size="sm"
              disabled={!!busy || !(Number(amount) > 0)}
              onClick={() => {
                if (!confirm(`Refund ৳${Number(amount).toFixed(2)}${viaGateway ? ` through ${gateway}` : ""}?`)) return;
                void act({ action: "refund", amount: Number(amount), method, reference, viaGateway }, "Refund recorded");
              }}
            >
              {spin("refund")} {viaGateway ? `Refund via ${gateway}` : "Record refund"}
            </Button>
            {!viaGateway && <p className="text-xs text-muted-foreground">Send the money first, then record it here.</p>}
          </div>
        </section>
      )}

      {type === "EXCHANGE" && (status === "APPROVED" || status === "RECEIVED") && (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <RefreshCw className="size-4" /> Replacement
          </h3>
          {replacementOrderId ? (
            <p className="mt-2">
              Replacement order{" "}
              <Link href={`/admin/orders/${replacementOrderId}`} className="font-medium underline">
                #{replacementOrderId.slice(0, 8)}
              </Link>{" "}
              is created — ship it like any order.
            </p>
          ) : (
            <div className="mt-2 grid gap-2">
              <Label className="grid gap-1 text-xs">
                Delivery charge to collect (৳)
                <Input inputMode="decimal" value={charge} onChange={(e) => setCharge(e.target.value)} />
              </Label>
              <Button size="sm" disabled={!!busy} onClick={() => void act({ action: "replacement", deliveryCharge: Number(charge) || 0 }, "Replacement order created")}>
                {spin("replacement")} Create replacement order
              </Button>
              <p className="text-xs text-muted-foreground">A free order with the new size / colour; stock is taken now.</p>
            </div>
          )}
        </section>
      )}

      {(status === "RECEIVED" || (status === "APPROVED" && type === "EXCHANGE" && replacementOrderId)) && (
        <Button variant="outline" className="w-full" disabled={!!busy} onClick={() => void act({ action: "complete" }, "Completed")}>
          {spin("complete")} Mark as completed
        </Button>
      )}

      {(refunded || done || restocked) && (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="font-semibold">Done so far</h3>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {restocked && <li>Items put back in stock</li>}
            {refunded && (
              <li>
                Refunded {refunded.amount} via {refunded.method}
                {refunded.reference ? ` (${refunded.reference})` : ""}
              </li>
            )}
            {replacementOrderId && <li>Replacement order #{replacementOrderId.slice(0, 8)}</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
