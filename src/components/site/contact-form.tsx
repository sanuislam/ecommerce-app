"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm({ defaults }: { defaults: { name: string; email: string; phone: string } }) {
  const [v, setV] = useState({ ...defaults, orderRef: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send");
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle2 className="mb-2 size-5" />
        Thanks — we got your message and will get back to you soon.
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="c-name">Your name</Label>
        <Input id="c-name" required minLength={2} maxLength={80} value={v.name} onChange={set("name")} autoComplete="name" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-phone">Mobile number</Label>
        <Input id="c-phone" inputMode="tel" maxLength={20} value={v.phone} onChange={set("phone")} autoComplete="tel" placeholder="01XXXXXXXXX" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-email">E-mail (optional)</Label>
        <Input id="c-email" type="email" maxLength={200} value={v.email} onChange={set("email")} autoComplete="email" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-order">Order number (optional)</Label>
        <Input id="c-order" maxLength={30} value={v.orderRef} onChange={set("orderRef")} placeholder="EB-10001" />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="c-msg">Message</Label>
        <Textarea id="c-msg" required minLength={10} maxLength={2000} rows={5} value={v.message} onChange={set("message")} />
      </div>
      {/* Bots fill every field; people never see this one. */}
      <input type="text" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <p className="text-xs text-muted-foreground sm:col-span-2">Give a mobile number or an e-mail so we can reply.</p>
      <Button type="submit" disabled={busy} className="justify-self-start">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send message
      </Button>
    </form>
  );
}
