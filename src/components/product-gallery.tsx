"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Full-screen photos: tap/click to zoom 2.5× where you point, swipe or arrows to move. */
function Lightbox({
  images,
  name,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  name: string;
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const open = index != null;
  const i = index ?? 0;
  const go = (d: number) => {
    setZoom(null);
    onIndex((i + d + images.length) % images.length);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black p-0 sm:max-w-none"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <DialogTitle className="sr-only">{name} — photos</DialogTitle>
        <div className="flex items-center justify-between p-3 text-sm text-white/80">
          <span>
            {i + 1} / {images.length}
          </span>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
            <X className="size-6" />
          </button>
        </div>
        <div
          className={cn("relative flex-1 overflow-hidden", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
          onClick={(e) => {
            if (zoom) return setZoom(null);
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseMove={(e) => {
            if (!zoom) return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
        >
          <Image
            src={images[i]}
            alt={`${name} — image ${i + 1}`}
            fill
            sizes="100vw"
            className="object-contain transition-transform duration-150"
            style={zoom ? { transform: "scale(2.5)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        </div>
        {images.length > 1 ? (
          <div className="flex items-center justify-center gap-6 p-4">
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className="rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
              <ChevronRight className="size-5" />
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Swipeable product image gallery with thumbnails. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false });
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

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
            <button
              type="button"
              key={src + i}
              onClick={() => setViewer(i)}
              aria-label={`Open image ${i + 1} full screen`}
              className="relative aspect-square min-w-0 flex-[0_0_100%] cursor-zoom-in"
            >
              <Image
                src={src}
                alt={i === 0 ? name : `${name} — image ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/40 p-1.5 text-white">
          <Expand className="size-4" />
        </span>
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
      <Lightbox images={images} name={name} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
    </div>
  );
}
