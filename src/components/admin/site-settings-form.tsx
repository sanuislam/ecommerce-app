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
};

export function SiteSettingsForm({
  initial,
}: {
  initial: SiteSettingsFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<SiteSettingsFormValues>(initial);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof SiteSettingsFormValues>(
    key: K,
    val: SiteSettingsFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save settings");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<{
    key: keyof SiteSettingsFormValues;
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
      <div>
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
