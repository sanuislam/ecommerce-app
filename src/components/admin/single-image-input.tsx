"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignResponse = {
  signature: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  folder?: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

export function SingleImageInput({
  value,
  onChange,
  folder = "eidbazar/brand",
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  folder?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/uploads/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Sign failed (${r.status})`);
      }
      const signed = (await r.json()) as SignResponse;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", signed.apiKey);
      fd.append("timestamp", String(signed.timestamp));
      fd.append("signature", signed.signature);
      if (signed.folder) fd.append("folder", signed.folder);
      const up = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
        { method: "POST", body: fd },
      );
      const data = (await up.json()) as { secure_url?: string; error?: { message: string } };
      if (!up.ok || !data.secure_url) {
        throw new Error(data.error?.message ?? `Upload failed (${up.status})`);
      }
      onChange(data.secure_url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted">
            <Image
              src={value}
              alt="Preview"
              fill
              sizes="80px"
              className="object-contain"
              unoptimized
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed bg-muted text-xs text-muted-foreground">
            No image
          </div>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… (or upload above)"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
