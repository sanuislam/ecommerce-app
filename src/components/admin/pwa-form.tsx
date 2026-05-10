"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SingleImageInput } from "@/components/admin/single-image-input";
import type { PwaSettingsValues } from "@/lib/pwa-settings";

export function PwaForm({ initial }: { initial: PwaSettingsValues }) {
  const router = useRouter();
  const [v, setV] = useState<PwaSettingsValues>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof PwaSettingsValues>(
    key: K,
    val: PwaSettingsValues[K],
  ) {
    setV((s) => ({ ...s, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pwa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      toast.success("PWA settings saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 sm:max-w-3xl">
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div>
          <Label className="text-base font-semibold">
            <Smartphone className="-mt-0.5 mr-1 inline size-4" />
            Enable Progressive Web App
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            When on, visitors get an installable app, offline shell and
            home-screen icon. The service worker registers automatically.
          </p>
        </div>
        <Switch
          checked={v.enabled}
          onCheckedChange={(b) => set("enabled", b)}
        />
      </div>

      <section className="grid gap-4">
        <h3 className="text-sm font-semibold">App identity</h3>
        <Field label="App name" hint="Shown on the install prompt and splash screen.">
          <Input value={v.appName} onChange={(e) => set("appName", e.target.value)} />
        </Field>
        <Field
          label="Short name"
          hint="Used on the home-screen icon label. Keep under 12 chars."
        >
          <Input
            value={v.shortName}
            onChange={(e) => set("shortName", e.target.value)}
            maxLength={12}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
          />
        </Field>
        <Field label="Start URL">
          <Input
            value={v.startUrl}
            onChange={(e) => set("startUrl", e.target.value)}
            placeholder="/"
          />
        </Field>
      </section>

      <section className="grid gap-4">
        <h3 className="text-sm font-semibold">Branding</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Theme color" hint="Browser chrome and splash background.">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={v.themeColor.startsWith("#") ? v.themeColor : `#${v.themeColor}`}
                onChange={(e) => set("themeColor", e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border bg-background"
              />
              <Input
                value={v.themeColor}
                onChange={(e) => set("themeColor", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Background color" hint="Splash screen background.">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={
                  v.backgroundColor.startsWith("#")
                    ? v.backgroundColor
                    : `#${v.backgroundColor}`
                }
                onChange={(e) => set("backgroundColor", e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border bg-background"
              />
              <Input
                value={v.backgroundColor}
                onChange={(e) => set("backgroundColor", e.target.value)}
              />
            </div>
          </Field>
        </div>
        <Field label="Icon 192×192 PNG" hint="Required for Android install.">
          <SingleImageInput
            value={v.icon192Url}
            onChange={(val) => set("icon192Url", val)}
            folder="eidbazar/pwa"
          />
        </Field>
        <Field label="Icon 512×512 PNG" hint="Required for splash screen.">
          <SingleImageInput
            value={v.icon512Url}
            onChange={(val) => set("icon512Url", val)}
            folder="eidbazar/pwa"
          />
        </Field>
        <Field
          label="Maskable icon (optional)"
          hint="Square PNG with 10% safe padding. Best results for Android adaptive icons."
        >
          <SingleImageInput
            value={v.maskableIconUrl}
            onChange={(val) => set("maskableIconUrl", val)}
            folder="eidbazar/pwa"
          />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Display mode">
          <Select
            value={v.display}
            onValueChange={(val) => set("display", val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standalone">Standalone (recommended)</SelectItem>
              <SelectItem value="fullscreen">Fullscreen</SelectItem>
              <SelectItem value="minimal-ui">Minimal UI</SelectItem>
              <SelectItem value="browser">Browser</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Orientation">
          <Select
            value={v.orientation}
            onValueChange={(val) => set("orientation", val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
              <SelectItem value="any">Any</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </section>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
