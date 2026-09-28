"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

export type SiteSettingsFormValues = {
  facebookUrl: string;
  whatsappUrl: string;
  instagramUrl: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  freeShippingThreshold: number;
};

type TextKey = Exclude<
  keyof SiteSettingsFormValues,
  "shippingInsideDhaka" | "shippingOutsideDhaka" | "freeShippingThreshold"
>;
type ShippingKey = Exclude<keyof SiteSettingsFormValues, TextKey>;

const SHIPPING_FIELDS: Array<{ key: ShippingKey; label: string; help: string }> = [
  {
    key: "shippingInsideDhaka",
    label: "Delivery charge inside Dhaka (৳)",
    help: "Charged when the delivery district is Dhaka.",
  },
  {
    key: "shippingOutsideDhaka",
    label: "Delivery charge outside Dhaka (৳)",
    help: "Charged for every other district.",
  },
  {
    key: "freeShippingThreshold",
    label: "Free delivery from (৳)",
    help: "Orders with a subtotal at or above this amount ship free. Set 0 to turn free delivery off.",
  },
];

export function SiteSettingsForm({
  initial,
}: {
  initial: SiteSettingsFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<SiteSettingsFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [shippingText, setShippingText] = useState<Record<ShippingKey, string>>({
    shippingInsideDhaka: String(initial.shippingInsideDhaka),
    shippingOutsideDhaka: String(initial.shippingOutsideDhaka),
    freeShippingThreshold: String(initial.freeShippingThreshold),
  });

  function update<K extends keyof SiteSettingsFormValues>(
    key: K,
    val: SiteSettingsFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const shipping = {} as Record<ShippingKey, number>;
    for (const { key, label } of SHIPPING_FIELDS) {
      const raw = shippingText[key].trim();
      const n = raw === "" ? 0 : Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        toast.error(`${label} must be a whole number of 0 or more`);
        return;
      }
      shipping[key] = n;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, ...shipping }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save settings");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<{
    key: TextKey;
    label: string;
    placeholder: string;
    help?: string;
    type?: string;
  }> = [
    {
      key: "facebookUrl",
      label: "Facebook URL",
      placeholder: "https://facebook.com/eidbazarOfficial",
      type: "url",
    },
    {
      key: "whatsappUrl",
      label: "WhatsApp URL",
      placeholder: "https://wa.me/8801966991000",
      help: "Use the wa.me/<digits> format with country code, no plus sign.",
      type: "url",
    },
    {
      key: "instagramUrl",
      label: "Instagram URL",
      placeholder: "https://instagram.com/eidbazar",
      help: "Leave blank to hide the Instagram icon in the footer.",
      type: "url",
    },
    {
      key: "supportEmail",
      label: "Support email",
      placeholder: "support@eidbazar.com",
      type: "email",
    },
    {
      key: "supportPhone",
      label: "Support phone",
      placeholder: "+880 1966-991000",
    },
    {
      key: "address",
      label: "Address",
      placeholder: "House 42, Road 11, Dhaka 1205, Bangladesh",
    },
  ];

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:max-w-2xl">
      {fields.map(({ key, label, placeholder, help, type }) => (
        <div key={key} className="grid gap-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            name={key}
            type={type ?? "text"}
            value={values[key]}
            placeholder={placeholder}
            onChange={(e) => update(key, e.target.value)}
          />
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      ))}

      <fieldset className="grid gap-4 rounded-lg border bg-card p-4">
        <legend className="px-1 text-sm font-semibold">Delivery charges</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {SHIPPING_FIELDS.map(({ key, label, help }) => (
            <div
              key={key}
              className={`grid content-start gap-1.5 ${key === "freeShippingThreshold" ? "sm:col-span-2" : ""}`}
            >
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                name={key}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required
                value={shippingText[key]}
                onChange={(e) =>
                  setShippingText((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">{help}</p>
            </div>
          ))}
        </div>
      </fieldset>
      <div>
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
