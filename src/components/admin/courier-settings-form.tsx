"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Plug, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Mode = "sandbox" | "live";
export type CourierSettingsInitial = {
  defaultWeightKg: number;
  steadfastEnabled: boolean;
  steadfastApiKey: string;
  steadfastSecretKey: string; // masked
  steadfastWebhookToken: string; // masked
  pathaoEnabled: boolean;
  pathaoMode: Mode;
  pathaoClientId: string;
  pathaoClientSecret: string; // masked
  pathaoUsername: string;
  pathaoPassword: string; // masked
  pathaoStoreId: number | null;
  pathaoWebhookSecret: string; // masked
  redxEnabled: boolean;
  redxMode: Mode;
  redxToken: string; // masked
  redxPickupStoreId: number | null;
};

type Store = { id: number; name: string; address?: string };
const SECRET_KEYS = [
  "steadfastSecretKey",
  "steadfastWebhookToken",
  "pathaoClientSecret",
  "pathaoPassword",
  "pathaoWebhookSecret",
  "redxToken",
] as const;

export function CourierSettingsForm({
  initial,
  webhooks,
}: {
  initial: CourierSettingsInitial;
  webhooks: Record<"steadfast" | "pathao" | "redx", string>;
}) {
  const router = useRouter();
  // Secret fields start empty: empty = keep the saved value.
  const [v, setV] = useState({
    ...initial,
    ...Object.fromEntries(SECRET_KEYS.map((k) => [k, ""])),
  } as CourierSettingsInitial);
  const [weight, setWeight] = useState(String(initial.defaultWeightKg));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [pathaoStores, setPathaoStores] = useState<Store[]>([]);
  const [redxStores, setRedxStores] = useState<Store[]>([]);

  const set = <K extends keyof CourierSettingsInitial>(k: K, val: CourierSettingsInitial[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/couriers/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, defaultWeightKg: Number(weight) || 0.5 }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success("Courier settings saved");
      setV((s) => ({ ...s, ...Object.fromEntries(SECRET_KEYS.map((k) => [k, ""])) }));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function test(courier: "steadfast" | "pathao" | "redx") {
    setTesting(courier);
    try {
      const res = await fetch("/api/admin/couriers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courier }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; stores?: Store[] };
      if (!data.ok) throw new Error(data.message ?? "Test failed");
      toast.success(data.message);
      if (courier === "pathao" && data.stores) setPathaoStores(data.stores);
      if (courier === "redx" && data.stores) setRedxStores(data.stores);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(null);
    }
  }

  const secretPh = (k: (typeof SECRET_KEYS)[number]) =>
    initial[k] ? `Saved ${initial[k]} — leave blank to keep` : "Not set";

  return (
    <div className="grid max-w-3xl gap-6">
      <Card
        title="Steadfast"
        enabled={v.steadfastEnabled}
        onEnabled={(b) => set("steadfastEnabled", b)}
        hint="Steadfast panel → API: copy the API key and secret key. Steadfast has no test mode: every booking is a real parcel."
        onTest={() => void test("steadfast")}
        testing={testing === "steadfast"}
        webhook={webhooks.steadfast}
        webhookHint="Steadfast panel → API → Webhook: paste this Callback URL and set an Auth Token (also enter it below)."
      >
        <Text label="API key" value={v.steadfastApiKey} onChange={(x) => set("steadfastApiKey", x)} />
        <Text label="Secret key" secret value={v.steadfastSecretKey} placeholder={secretPh("steadfastSecretKey")} onChange={(x) => set("steadfastSecretKey", x)} />
        <Text
          label="Webhook auth token (optional)"
          secret
          value={v.steadfastWebhookToken}
          placeholder={secretPh("steadfastWebhookToken")}
          onChange={(x) => set("steadfastWebhookToken", x)}
        />
      </Card>

      <Card
        title="Pathao"
        enabled={v.pathaoEnabled}
        onEnabled={(b) => set("pathaoEnabled", b)}
        hint="Pathao merchant panel → Developers API: client ID and secret; sign-in e-mail and password of the merchant account. Use Sandbox to try it first."
        onTest={() => void test("pathao")}
        testing={testing === "pathao"}
        webhook={webhooks.pathao}
        webhookHint="Pathao panel → Developers API → Webhook: paste this URL, and copy the webhook secret it shows into the field below."
        mode={v.pathaoMode}
        onMode={(m) => set("pathaoMode", m)}
      >
        <Text label="Client ID" value={v.pathaoClientId} onChange={(x) => set("pathaoClientId", x)} />
        <Text label="Client secret" secret value={v.pathaoClientSecret} placeholder={secretPh("pathaoClientSecret")} onChange={(x) => set("pathaoClientSecret", x)} />
        <Text label="Merchant e-mail" value={v.pathaoUsername} onChange={(x) => set("pathaoUsername", x)} />
        <Text label="Merchant password" secret value={v.pathaoPassword} placeholder={secretPh("pathaoPassword")} onChange={(x) => set("pathaoPassword", x)} />
        <StorePick
          label="Pickup store"
          stores={pathaoStores}
          value={v.pathaoStoreId}
          onChange={(id) => set("pathaoStoreId", id)}
          hint="Save, then Test connection to list your stores."
        />
        <Text
          label="Webhook secret"
          secret
          value={v.pathaoWebhookSecret}
          placeholder={secretPh("pathaoWebhookSecret")}
          onChange={(x) => set("pathaoWebhookSecret", x)}
        />
      </Card>

      <Card
        title="RedX"
        enabled={v.redxEnabled}
        onEnabled={(b) => set("redxEnabled", b)}
        hint="RedX panel → Developer API: generate an API access token. Use Sandbox to try it first."
        onTest={() => void test("redx")}
        testing={testing === "redx"}
        webhook={webhooks.redx}
        webhookHint="RedX panel → Developer API → Webhook: paste this URL."
        mode={v.redxMode}
        onMode={(m) => set("redxMode", m)}
      >
        <Text label="API access token" secret value={v.redxToken} placeholder={secretPh("redxToken")} onChange={(x) => set("redxToken", x)} />
        <StorePick
          label="Pickup store (optional)"
          stores={redxStores}
          value={v.redxPickupStoreId}
          onChange={(id) => set("redxPickupStoreId", id)}
          hint="Empty = your default RedX pickup store."
        />
      </Card>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="weight">Default parcel weight (kg)</Label>
          <Input id="weight" inputMode="decimal" className="w-32" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <Button onClick={() => void save()} disabled={saving} className="ml-auto">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save all
        </Button>
      </div>
    </div>
  );
}

function Card({
  title,
  enabled,
  onEnabled,
  hint,
  onTest,
  testing,
  webhook,
  webhookHint,
  mode,
  onMode,
  children,
}: {
  title: string;
  enabled: boolean;
  onEnabled: (b: boolean) => void;
  hint: string;
  onTest: () => void;
  testing: boolean;
  webhook: string;
  webhookHint: string;
  mode?: Mode;
  onMode?: (m: Mode) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabled} aria-label={`Use ${title}`} />
      </div>
      {mode && onMode && (
        <div className="mt-4 inline-flex rounded-lg border p-0.5 text-sm" role="radiogroup" aria-label="Environment">
          {(["sandbox", "live"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => onMode(m)}
              className={`rounded-md px-3 py-1 ${mode === m ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {m === "sandbox" ? "Sandbox (test)" : "Live"}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="mt-4 rounded-lg bg-muted/50 p-3">
        <div className="text-xs font-medium">Webhook URL</div>
        <div className="mt-1 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate text-xs">{webhook}</code>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Copy webhook URL"
            onClick={() => {
              void navigator.clipboard?.writeText(webhook);
              toast.success("Copied");
            }}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{webhookHint}</p>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onTest} disabled={testing}>
        {testing ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />} Test connection
      </Button>
    </section>
  );
}

function Text({
  label,
  value,
  onChange,
  secret,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secret?: boolean;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={secret ? "password" : "text"}
        autoComplete={secret ? "new-password" : "off"}
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StorePick({
  label,
  stores,
  value,
  onChange,
  hint,
}: {
  label: string;
  stores: Store[];
  value: number | null;
  onChange: (id: number | null) => void;
  hint: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {stores.length ? (
        <select
          id={id}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value) || null)}
        >
          <option value="">Choose a store</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          inputMode="numeric"
          placeholder="Store ID"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || null)}
        />
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
