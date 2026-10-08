"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PaymentSettingsClient } from "@/lib/payment-settings";

type FormState = {
  upayEnabled: boolean;
  upayBaseUrl: string;
  upayMerchantId: string;
  upayMerchantKey: string;
  upayMerchantName: string;
  upayMerchantCode: string;
  upayMerchantCity: string;
  upayMerchantMobile: string;
};

const TEXT_FIELDS: {
  key: Exclude<keyof FormState, "upayEnabled" | "upayMerchantKey">;
  label: string;
  hint?: string;
  placeholder?: string;
}[] = [
  {
    key: "upayBaseUrl",
    label: "Base URL",
    hint: "Test (UAT): https://uat-pg.upay.systems — use the live URL Upay gives you with the live credentials.",
    placeholder: "https://uat-pg.upay.systems",
  },
  { key: "upayMerchantId", label: "Merchant ID" },
  { key: "upayMerchantName", label: "Merchant name", hint: "Your business name as registered with Upay." },
  {
    key: "upayMerchantCode",
    label: "Merchant code",
    hint: "Also sent as the merchant category code, as the Upay doc asks.",
  },
  { key: "upayMerchantCity", label: "Merchant city", placeholder: "Dhaka" },
  { key: "upayMerchantMobile", label: "Merchant mobile", placeholder: "01XXXXXXXXX" },
];

export function UpaySettingsForm({ initial }: { initial: PaymentSettingsClient }) {
  const router = useRouter();
  const [values, setValues] = useState<FormState>({
    upayEnabled: initial.upayEnabled,
    upayBaseUrl: initial.upayBaseUrl,
    upayMerchantId: initial.upayMerchantId,
    upayMerchantKey: "",
    upayMerchantName: initial.upayMerchantName,
    upayMerchantCode: initial.upayMerchantCode,
    upayMerchantCity: initial.upayMerchantCity,
    upayMerchantMobile: initial.upayMerchantMobile,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      values.upayEnabled &&
      (!values.upayMerchantId.trim() ||
        !values.upayMerchantName.trim() ||
        !values.upayMerchantCode.trim() ||
        !values.upayMerchantMobile.trim() ||
        (!initial.hasUpayMerchantKey && !values.upayMerchantKey.trim()))
    ) {
      toast.error("Merchant ID, key, name, code and mobile are required to enable Upay");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payments/upay/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      toast.success("Upay settings saved");
      setValues((v) => ({ ...v, upayMerchantKey: "" }));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    if (saving || testing) return;
    setTesting(true);
    try {
      const res = await fetch("/api/admin/payments/upay/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        baseUrl?: string;
        message?: string;
      };
      if (data.ok) toast.success(`Upay: ${data.message ?? "Authorized"} · ${data.baseUrl ?? ""}`);
      else toast.error(`Upay test failed: ${data.message ?? "Unknown error"}`);
    } catch {
      toast.error("Test request failed");
    } finally {
      setTesting(false);
    }
  }

  // What checkout sees right now (the SAVED settings, not unsaved edits).
  const missing = [
    !initial.upayMerchantId && "Merchant ID",
    !initial.hasUpayMerchantKey && "Merchant key",
    !initial.upayMerchantName && "Merchant name",
    !initial.upayMerchantCode && "Merchant code",
    !initial.upayMerchantMobile && "Merchant mobile",
  ].filter(Boolean) as string[];
  const live = initial.upayEnabled && missing.length === 0;
  const why = [
    ...(initial.upayEnabled ? [] : ["the switch below is off"]),
    ...(missing.length ? [`missing: ${missing.join(", ")}`] : []),
  ].join("; ");

  return (
    <form onSubmit={onSubmit} className="grid gap-6 sm:max-w-2xl">
      <div
        role="status"
        className={
          live
            ? "rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300"
            : "rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
        }
      >
        {live
          ? "Live: checkout shows “Mobile banking” (bKash, Nagad, Upay)."
          : `Not shown at checkout — ${why}. Fill in the fields, turn the switch on and press Save.`}
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-base font-semibold">Enable Upay gateway</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              When on, checkout shows “Mobile banking” (bKash, Nagad, Upay): customers
              are sent to the Upay payment page and the order is confirmed
              automatically. When off, it is not offered at checkout.
            </p>
          </div>
          <Switch checked={values.upayEnabled} onCheckedChange={(v) => set("upayEnabled", v)} />
        </div>
      </div>

      {TEXT_FIELDS.slice(0, 2).map((f) => (
        <Field key={f.key} f={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
      ))}

      <div className="grid gap-1.5">
        <Label htmlFor="upayMerchantKey">Merchant key</Label>
        <Input
          id="upayMerchantKey"
          type="password"
          value={values.upayMerchantKey}
          onChange={(e) => set("upayMerchantKey", e.target.value)}
          placeholder={
            initial.hasUpayMerchantKey
              ? `Saved · ${initial.upayMerchantKeyMasked} (leave blank to keep)`
              : "Enter merchant key"
          }
          autoComplete="new-password"
        />
      </div>

      {TEXT_FIELDS.slice(2).map((f) => (
        <Field key={f.key} f={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
      ))}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          Save changes
        </Button>
        <Button type="button" variant="outline" onClick={onTest} disabled={testing || saving}>
          {testing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plug className="mr-2 size-4" />}
          Test connection
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Save first, then test — the test uses the saved Merchant ID and key. Upay sends
        customers back to <code>/api/payments/upay/callback</code> on this site; every result
        is re-checked with Upay before an order is marked paid.
      </p>
    </form>
  );
}

function Field({
  f,
  value,
  onChange,
}: {
  f: (typeof TEXT_FIELDS)[number];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={f.key}>{f.label}</Label>
      <Input
        id={f.key}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={f.placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
    </div>
  );
}
