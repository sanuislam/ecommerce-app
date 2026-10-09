"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

/** Up to `max` photos, uploaded straight to the shop's Cloudinary (signed by our server). */
export function PhotoPicker({
  kind,
  value,
  onChange,
  max = 4,
}: {
  kind: "review" | "return";
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, max - value.length);
    setBusy(true);
    const out: string[] = [];
    try {
      for (const f of list) {
        if (!f.type.startsWith("image/")) throw new Error("Only photos can be added");
        if (f.size > 5 * 1024 * 1024) throw new Error("Each photo must be under 5 MB");
        const sres = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        });
        const sig = (await sres.json()) as { signature: string; apiKey: string; cloudName: string; timestamp: number; folder: string; error?: string };
        if (!sres.ok) throw new Error(sig.error ?? "Upload is not available");
        const fd = new FormData();
        fd.append("file", f);
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", String(sig.timestamp));
        fd.append("signature", sig.signature);
        fd.append("folder", sig.folder);
        const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
        const j = (await up.json()) as { secure_url?: string; error?: { message?: string } };
        if (!up.ok || !j.secure_url) throw new Error(j.error?.message ?? "Upload failed");
        out.push(j.secure_url);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (out.length) onChange([...value, ...out].slice(0, max));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((u) => (
        <div key={u} className="relative size-16 overflow-hidden rounded-md border">
          <Image src={u} alt="" fill sizes="64px" className="object-cover" />
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => onChange(value.filter((x) => x !== u))}
            className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      {value.length < max ? (
        <label className="flex size-16 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          <span>Add</span>
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>
      ) : null}
    </div>
  );
}
