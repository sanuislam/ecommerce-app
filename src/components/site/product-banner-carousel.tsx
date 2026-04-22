"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

export type BannerProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAt: number | null;
  images: string[];
  description?: string | null;
  category?: { name: string } | null;
};

const AUTOPLAY_MS = 5500;

export function ProductBannerCarousel({
  products,
}: {
  products: BannerProduct[];
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", duration: 32 },
    [
      Autoplay({
        delay: AUTOPLAY_MS,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );
  const [selected, setSelected] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [progressKey, setProgressKey] = useState(0);

  const scrollTo = useCallback(
    (idx: number) => emblaApi?.scrollTo(idx),
    [emblaApi],
  );
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onInit = () => setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => {
      setSelected(emblaApi.selectedScrollSnap());
      setProgressKey((k) => k + 1);
    };
    onInit();
    onSelect();
    emblaApi.on("reInit", onInit);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onInit);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  if (products.length === 0) return null;

  const total = products.length;

  return (
    <section
      aria-label="Featured products"
      className="relative isolate overflow-hidden border-b bg-neutral-950 text-white"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {products.map((p, idx) => {
            const active = idx === selected;
            const image = p.images[0];
            const discount =
              p.compareAt && p.compareAt > p.price
                ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100)
                : 0;
            return (
              <div
                key={p.id}
                className="relative min-w-0 flex-[0_0_100%]"
                aria-hidden={!active}
              >
                <div className="relative h-[clamp(420px,62vh,640px)] w-full">
                  {image ? (
                    <motion.div
                      key={active ? `active-${idx}-${progressKey}` : `idle-${idx}`}
                      initial={{ scale: 1.08 }}
                      animate={{ scale: active ? 1.14 : 1.08 }}
                      transition={{
                        duration: active ? AUTOPLAY_MS / 1000 + 1 : 0,
                        ease: "linear",
                      }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={image}
                        alt={p.name}
                        fill
                        priority={idx === 0}
                        sizes="100vw"
                        className="object-cover"
                      />
                    </motion.div>
                  ) : (
                    <div className="absolute inset-0 bg-neutral-900" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                    <AnimatePresence mode="wait">
                      {active && (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          className="max-w-xl space-y-5"
                        >
                          <div className="flex items-center gap-2">
                            {p.category?.name && (
                              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] backdrop-blur">
                                {p.category.name}
                              </span>
                            )}
                            {discount > 0 && (
                              <span className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
                                Save {discount}%
                              </span>
                            )}
                          </div>

                          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                            {p.name}
                          </h1>

                          {p.description && (
                            <p className="line-clamp-2 max-w-prose text-sm text-white/75 sm:text-base">
                              {p.description}
                            </p>
                          )}

                          <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold tracking-tight sm:text-4xl">
                              {formatPrice(p.price)}
                            </span>
                            {p.compareAt != null && p.compareAt > p.price && (
                              <span className="text-lg text-white/60 line-through">
                                {formatPrice(p.compareAt)}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Button asChild size="lg" className="h-12 px-6 text-base">
                              <Link href={`/products/${p.slug}`}>
                                Shop now <ArrowRight className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="lg"
                              variant="outline"
                              className="h-12 border-white/30 bg-white/5 px-6 text-base text-white hover:bg-white/15 hover:text-white"
                            >
                              <Link href="/products?featured=1">View collection</Link>
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex lg:left-6"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex lg:right-6"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 pb-5 sm:px-6 lg:px-8">
          <div className="pointer-events-auto flex items-center gap-2">
            {scrollSnaps.map((_, idx) => {
              const isActive = idx === selected;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollTo(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={isActive}
                  className={cn(
                    "relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-[width] duration-300",
                    isActive ? "w-10" : "w-5 hover:bg-white/40",
                  )}
                >
                  {isActive && (
                    <motion.span
                      key={`progress-${selected}-${progressKey}`}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                      className="absolute inset-y-0 left-0 block bg-white"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="font-mono text-xs tracking-widest text-white/70 tabular-nums">
            {String(selected + 1).padStart(2, "0")}
            <span className="mx-1 text-white/30">/</span>
            {String(total).padStart(2, "0")}
          </div>
        </div>
      </div>
    </section>
  );
}
