"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignResponse = {
  signature: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  folder?: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

export function ImageUploader({
  value,
  onChange,
  folder = "eidbazar/products",
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  folder?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [manual, setManual] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setBusy(true);
      try {
        let signed: SignResponse | null = null;
        try {
          const r = await fetch("/api/admin/uploads/sign", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ folder }),
          });
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err?.error ?? `Sign failed (${r.status})`);
          }
          signed = (await r.json()) as SignResponse;
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Could not get upload signature",
          );
          return;
        }

        const uploadUrl = `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`;
        const uploaded: string[] = [];
        for (const file of list) {
          if (!file.type.startsWith("image/")) {
            toast.error(`${file.name} is not an image`);
            continue;
          }
          if (file.size > MAX_BYTES) {
            toast.error(`${file.name} is larger than 10 MB`);
            continue;
          }
          const fd = new FormData();
          fd.append("file", file);
          fd.append("api_key", signed.apiKey);
          fd.append("timestamp", String(signed.timestamp));
          fd.append("signature", signed.signature);
          if (signed.folder) fd.append("folder", signed.folder);
          try {
            const r = await fetch(uploadUrl, { method: "POST", body: fd });
            const json = await r.json();
            if (!r.ok) {
              throw new Error(
                json?.error?.message ?? `Upload failed (${r.status})`,
              );
            }
            if (typeof json.secure_url === "string") {
              uploaded.push(json.secure_url);
            }
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : `Upload failed for ${file.name}`,
            );
          }
        }
        if (uploaded.length) {
          onChange([...value, ...uploaded]);
          toast.success(
            uploaded.length === 1
              ? "Image uploaded"
              : `${uploaded.length} images uploaded`,
          );
        }
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [folder, onChange, value],
  );

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function addManual() {
    const url = manual.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    onChange([...value, url]);
    setManual("");
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 bg-muted/20"
        }`}
      >
        <ImagePlus className="size-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          Drag & drop images, or click to choose
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPG, WebP up to 10 MB. Stored on Cloudinary.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 size-3.5" />
              Choose images
            </>
          )}
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="group relative overflow-hidden rounded-md border bg-card"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              <div className="absolute inset-x-1 top-1 flex items-center justify-between text-[10px] text-white">
                <span className="rounded bg-black/60 px-1.5 py-0.5">
                  {i === 0 ? "Cover" : `#${i + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-full bg-black/60 p-1 opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <X className="size-3" />
                </button>
              </div>
              <div className="absolute inset-x-1 bottom-1 flex justify-between text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded bg-black/60 px-1.5 py-0.5 disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rounded bg-black/60 px-1.5 py-0.5 disabled:opacity-30"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, 1)}
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder="…or paste an image URL"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addManual();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addManual}
          disabled={!manual.trim()}
        >
          Add URL
        </Button>
      </div>
    </div>
  );
}
