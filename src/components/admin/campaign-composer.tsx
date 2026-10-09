"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { smsInfo } from "@/lib/sms-count";
import type { Audience } from "@/lib/segments";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function CampaignComposer({
  audience,
  recipients,
  smsReady,
  balance,
  myPhone,
  shop,
  site,
}: {
  audience: Audience;
  recipients: number;
  smsReady: boolean;
  balance: string | null;
  myPhone: string;
  shop: string;
  site: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState(`${shop}: `);
  const [testPhone, setTestPhone] = useState(myPhone);
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const info = smsInfo(message);
  const total = info.parts * recipients;

  async function test() {
    setBusy("test");
    try {
      await post("/api/admin/campaigns/test", { phone: testPhone, message });
      toast.success("Test SMS sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!confirm(`Send this SMS to ${recipients} number${recipients === 1 ? "" : "s"}? It uses about ${total} SMS and can't be undone.`)) return;
    setBusy("send");
    try {
      await post("/api/admin/campaigns", { name, message, audience, confirmCount: recipients });
      toast.success("Sending started");
      router.push("/admin/campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-4 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="font-semibold">2. The message</h2>
      <div className="mt-3 grid gap-4">
        <div className="grid gap-1.5 sm:max-w-sm">
          <Label htmlFor="c-name">Campaign name (only you see it)</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Eid offer — lapsed buyers" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-msg">SMS text</Label>
          <Textarea
            id="c-msg"
            rows={4}
            maxLength={612}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`${shop}: Eid offer! 15% off everything with code EID15 till Friday. ${site}`}
          />
          <p className="text-xs text-muted-foreground">
            {info.chars} characters · <span className="font-medium text-foreground">{info.parts} SMS</span> per number
            {info.unicode
              ? " · Bangla, emoji or ৳ make it Unicode (70 characters per SMS). Write \"Tk\" instead of ৳ to fit more."
              : " · 160 characters per SMS (153 when longer)"}
            . Put your shop name first and a link or coupon in it.
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="font-medium tabular-nums">{recipients}</span> number{recipients === 1 ? "" : "s"} ×{" "}
          <span className="tabular-nums">{info.parts}</span> = <span className="font-semibold tabular-nums">{total} SMS</span>
          {balance != null ? <span className="text-muted-foreground"> · balance {balance}</span> : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="c-test" className="text-xs text-muted-foreground">
              Test on your phone first
            </Label>
            <Input id="c-test" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-40" />
          </div>
          <Button type="button" variant="outline" disabled={!!busy || !smsReady || message.trim().length < 5} onClick={test}>
            {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />} Send test
          </Button>
          <Button
            type="button"
            className="ml-auto"
            disabled={!!busy || !smsReady || !recipients || name.trim().length < 2 || message.trim().length < 5}
            onClick={send}
          >
            {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send to {recipients}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Promotional SMS in Bangladesh go best from an approved masking sender ID (set in Admin → SMS). Send between
          10 am and 8 pm.
        </p>
      </div>
    </section>
  );
}
