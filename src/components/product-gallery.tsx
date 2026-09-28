"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

/** Swipeable product image gallery with thumbnails. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false });
  const [active, setActive] = useState(0);

  const onSelect = useCallback(() => {
    if (embla) setActive(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onSelect]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
        No image
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border bg-muted" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {images.map((src, i) => (
            <div key={src + i} className="relative aspect-square min-w-0 flex-[0_0_100%]">
              <Image
                src={src}
                alt={i === 0 ? name : `${name} — image ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full bg-white/70 shadow transition-all",
                  i === active ? "w-5 bg-white" : "w-1.5",
                )}
              />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Product images">
          {images.slice(0, 10).map((img, i) => (
            <button
              key={img + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border bg-muted transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                i === active ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100",
              )}
            >
              <Image src={img} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
