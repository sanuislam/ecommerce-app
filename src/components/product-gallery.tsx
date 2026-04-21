"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const main = images[active];

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        key={main}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative aspect-square w-full overflow-hidden rounded-xl border bg-muted"
      >
        {main ? (
          <Image
            src={main}
            alt={name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </motion.div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border bg-muted transition",
                i === active ? "ring-2 ring-primary" : "hover:opacity-90",
              )}
            >
              <Image
                src={img}
                alt={`${name} thumbnail ${i + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
