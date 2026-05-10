"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentSettingsClient } from "@/lib/payment-settings";

type FormState = {
  bkashEnabled: boolean;
  bkashMode: "sandbox" | "live";
  bkashUsername: string;
  bkashPassword: string;
  bkashAppKey: string;
  bkashAppSecret: string;
};

export function PaymentSettingsForm({
  initial,
}: {
  initial: PaymentSettingsClient;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormState>({
    bkashEnabled: initial.bkashEnabled,
    bkashMode: initial.bkashMode,
    bkashUsername: initial.bkashUsername,
    bkashPassword: "",
    bkashAppKey: initial.bkashAppKey,
    bkashAppSecret: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      values.bkashEnabled &&
      (!values.bkashUsername.trim() ||
        !values.bkashAppKey.trim() ||
        (!initial.hasPassword && !values.bkashPassword.trim()) ||
        (!initial.hasAppSecret && !values.bkashAppSecret.trim()))
    ) {
      toast.error("All fields are required to enable bKash");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payments/bkash/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      toast.success("bKash settings saved");
      // Clear the temporary secret inputs after a successful save.
      setValues((v) => ({ ...v, bkashPassword: "", bkashAppSecret: "" }));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    if (saving || testing) return;
    setTesting(true);
    try {
      const res = await fetch("/api/admin/payments/bkash/test", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        baseUrl?: string;
        message?: string;
      };
      if (data.ok) {
        toast.success(`bKash reachable · ${data.baseUrl ?? ""}`);
      } else {
        toast.error(`bKash test failed: ${data.message ?? "Unknown error"}`);
      }
    } catch {
      toast.error("Test request failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 sm:max-w-2xl">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-base font-semibold">
              Enable bKash live gateway
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              When off, bKash falls back to the manual Sender + TrxID entry flow
              regardless of the credentials below.
            </p>
          </div>
          <Switch
            checked={values.bkashEnabled}
            onCheckedChange={(v) => set("bkashEnabled", v)}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="bkashMode">Environment</Label>
        <Select
          value={values.bkashMode}
          onValueChange={(v) => set("bkashMode", v as "sandbox" | "live")}
        >
          <SelectTrigger id="bkashMode" className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">Sandbox (testing)</SelectItem>
            <SelectItem value="live">Live (production merchant)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Sandbox base URL: <code>tokenized.sandbox.bka.sh</code> · Live base
          URL: <code>tokenized.pay.bka.sh</code>
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="bkashUsername">Username</Label>
        <Input
          id="bkashUsername"
          value={values.bkashUsername}
          onChange={(e) => set("bkashUsername", e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="bkashPassword">Password</Label>
        <Input
          id="bkashPassword"
          type="password"
          value={values.bkashPassword}
          onChange={(e) => set("bkashPassword", e.target.value)}
          placeholder={
            initial.hasPassword
              ? `Saved · ${initial.bkashPasswordMasked} (leave blank to keep)`
              : "Enter password"
          }
          autoComplete="new-password"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="bkashAppKey">App Key</Label>
        <Input
          id="bkashAppKey"
          value={values.bkashAppKey}
          onChange={(e) => set("bkashAppKey", e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="bkashAppSecret">App Secret</Label>
        <Input
          id="bkashAppSecret"
          type="password"
          value={values.bkashAppSecret}
          onChange={(e) => set("bkashAppSecret", e.target.value)}
          placeholder={
            initial.hasAppSecret
              ? `Saved · ${initial.bkashAppSecretMasked} (leave blank to keep)`
              : "Enter app secret"
          }
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onTest}
          disabled={testing || saving}
        >
          {testing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plug className="mr-2 size-4" />
          )}
          Test connection
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Get sandbox credentials at{" "}
        <a
          href="https://merchantdemo.sandbox.bka.sh/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          merchantdemo.sandbox.bka.sh
        </a>{" "}
        → API Key tab. For live keys contact your bKash merchant onboarding
        manager.
      </p>
    </form>
  );
}
