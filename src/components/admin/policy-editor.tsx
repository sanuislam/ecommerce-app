"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

type Values = {
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
};

export function PolicyEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: Values;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Values>(key: K, val: Values[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/policies/${slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save");
        return;
      }
      toast.success("Saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="titleEn">Title (English)</Label>
          <Input
            id="titleEn"
            value={values.titleEn}
            onChange={(e) => update("titleEn", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="titleBn">Title (বাংলা)</Label>
          <Input
            id="titleBn"
            lang="bn"
            value={values.titleBn}
            onChange={(e) => update("titleBn", e.target.value)}
          />
        </div>
      </div>

      <BodyField
        id="bodyBn"
        label="Body (বাংলা)"
        lang="bn"
        value={values.bodyBn}
        onChange={(v) => update("bodyBn", v)}
      />

      <BodyField
        id="bodyEn"
        label="Body (English)"
        lang="en"
        value={values.bodyEn}
        onChange={(v) => update("bodyEn", v)}
      />

      <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground">
        Markdown supported: <code># Heading</code>, <code>## H2</code>,{" "}
        <code>**bold**</code>, <code>*italic*</code>,{" "}
        <code>[link](https://…)</code>, <code>- bullet</code>,{" "}
        <code>1. numbered</code>, <code>{"> quote"}</code>. Bengali typing
        works as plain text.
      </div>

      <div>
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function BodyField({
  id,
  label,
  lang,
  value,
  onChange,
}: {
  id: string;
  label: string;
  lang: "en" | "bn";
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid gap-3 lg:grid-cols-2">
        <Textarea
          id={id}
          lang={lang}
          rows={18}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
        />
        <div
          lang={lang}
          className="prose prose-sm max-w-none rounded-md border bg-card p-4 dark:prose-invert [&_h1]:mt-0 [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:text-lg"
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">Live preview…</p>
          )}
        </div>
      </div>
    </div>
  );
}
