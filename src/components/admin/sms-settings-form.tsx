"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plug, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Ev = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

/** GSM-7 fits 160 characters per SMS (153 when split); Bangla / Unicode 70 (67). */
function segments(text: string) {
  if (!text) return { parts: 0, unicode: false };
  const unicode = /[^\x00-\x7F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { parts: text.length <= single ? 1 : Math.ceil(text.length / multi), unicode };
}

export function SmsSettingsForm({
  initial,
  events,
  vars,
}: {
  initial: {
    enabled: boolean;
    hasKey: boolean;
    keyHint: string;
    senderId: string;
    on: Record<Ev, boolean>;
    templates: Record<Ev, string>;
  };
  events: { id: Ev; label: string; fallback: string }[];
  vars: string[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState(initial.senderId);
  const [on, setOn] = useState(initial.on);
  const [templates, setTemplates] = useState(initial.templates);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, apiKey, senderId, on, templates }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success("SMS settings saved");
      setApiKey("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function test(to?: string) {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(to ? { to } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!data.ok) throw new Error(data.message ?? "Test failed");
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Alpha SMS account</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              sms.net.bd → API: copy your API key. A sender ID (masking) is optional and must be approved by Alpha SMS.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Send SMS" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              type="password"
              autoComplete="new-password"
              placeholder={initial.hasKey ? `Saved ${initial.keyHint} — leave blank to keep` : "Not set"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="senderId">Sender ID (optional)</Label>
            <Input id="senderId" value={senderId} onChange={(e) => setSenderId(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void test()} disabled={testing}>
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />} Check balance
          </Button>
          <Input
            className="h-8 w-40"
            placeholder="01XXXXXXXXX"
            inputMode="tel"
            aria-label="Test number"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void test(testTo)} disabled={testing || !testTo}>
            <Send className="size-4" /> Send test SMS
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Messages</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          You can use {vars.join(" ")}. English fits 160 characters in one SMS; Bangla fits 70, so it costs more.
        </p>
        <div className="mt-4 grid gap-5">
          {events.map((e) => {
            const seg = segments(templates[e.id]);
            return (
              <div key={e.id} className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={`tpl-${e.id}`} className="font-medium">
                    {e.label}
                  </Label>
                  <Switch
                    checked={on[e.id]}
                    onCheckedChange={(b) => setOn((o) => ({ ...o, [e.id]: b }))}
                    aria-label={`Send "${e.label}" SMS`}
                  />
                </div>
                <Textarea
                  id={`tpl-${e.id}`}
                  rows={2}
                  maxLength={480}
                  disabled={!on[e.id]}
                  value={templates[e.id]}
                  placeholder={e.fallback}
                  onChange={(x) => setTemplates((t) => ({ ...t, [e.id]: x.target.value }))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => setTemplates((t) => ({ ...t, [e.id]: e.fallback }))}
                  >
                    Reset to default
                  </button>
                  <span className="tabular-nums">
                    {templates[e.id].length} characters · about {seg.parts} SMS{seg.unicode ? " (Bangla)" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
        </Button>
      </div>
    </div>
  );
}
