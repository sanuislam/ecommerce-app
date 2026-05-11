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
      className="relative isolate overflow-hidden border-b bg-neutral-950 text-white md:bg-gradient-to-br md:from-rose-50 md:via-amber-50 md:to-white md:text-neutral-900"
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
                {/* Mobile: full-bleed image with overlay text (unchanged) */}
                <div className="relative h-[clamp(420px,62vh,640px)] w-full md:hidden">
                  {image ? (
                    <motion.div
                      key={active ? `m-active-${idx}-${progressKey}` : `m-idle-${idx}`}
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
                          key={`m-${p.id}`}
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

                          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                            {p.name}
                          </h2>

                          {p.description && (
                            <p className="line-clamp-2 max-w-prose text-sm text-white/75 sm:text-base">
                              {p.description}
                            </p>
                          )}

                          <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold tracking-tight sm:text-4xl">
                              {formatPrice(p.price)}
                            </span>
                            {p.compareAt && p.compareAt > p.price && (
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

                {/* Desktop: two-column split — text left, image right */}
                <div className="relative hidden h-[clamp(460px,68vh,680px)] w-full md:block">
                  {/* decorative gradient blobs */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-rose-200/60 blur-3xl"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-32 -bottom-24 h-96 w-96 rounded-full bg-amber-200/60 blur-3xl"
                  />

                  <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-12 items-center gap-8 px-6 lg:gap-12 lg:px-8">
                    {/* Left: text */}
                    <AnimatePresence mode="wait">
                      {active && (
                        <motion.div
                          key={`d-text-${p.id}`}
                          initial={{ opacity: 0, x: -24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          className="col-span-6 space-y-5"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {p.category?.name && (
                              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-700 shadow-sm backdrop-blur">
                                {p.category.name}
                              </span>
                            )}
                            {discount > 0 && (
                              <span className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm">
                                Save {discount}%
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-800 shadow-sm">
                              Featured
                            </span>
                          </div>

                          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-900 lg:text-6xl">
                            {p.name}
                          </h1>

                          {p.description && (
                            <p className="line-clamp-3 max-w-prose text-base text-neutral-600 lg:text-lg">
                              {p.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-baseline gap-3 pt-1">
                            <span className="text-4xl font-bold tracking-tight text-neutral-900 lg:text-5xl">
                              {formatPrice(p.price)}
                            </span>
                            {p.compareAt && p.compareAt > p.price && (
                              <>
                                <span className="text-xl text-neutral-400 line-through lg:text-2xl">
                                  {formatPrice(p.compareAt)}
                                </span>
                                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                  You save {formatPrice(p.compareAt - p.price)}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button
                              asChild
                              size="lg"
                              className="h-12 bg-neutral-900 px-7 text-base text-white hover:bg-neutral-800"
                            >
                              <Link href={`/products/${p.slug}`}>
                                Shop now <ArrowRight className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="lg"
                              variant="outline"
                              className="h-12 border-neutral-300 bg-white/70 px-6 text-base text-neutral-800 hover:bg-white"
                            >
                              <Link href="/products?featured=1">
                                View collection
                              </Link>
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Right: product image card */}
                    <AnimatePresence mode="wait">
                      {active && (
                        <motion.div
                          key={`d-img-${p.id}`}
                          initial={{ opacity: 0, x: 32, scale: 0.96 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 16, scale: 0.98 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="col-span-6 flex justify-center lg:justify-end"
                        >
                          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 lg:max-w-lg">
                            {image ? (
                              <Image
                                src={image}
                                alt={p.name}
                                fill
                                priority={idx === 0}
                                sizes="(min-width: 1024px) 32rem, (min-width: 768px) 28rem, 100vw"
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-neutral-100" />
                            )}

                            {discount > 0 && (
                              <div className="absolute left-4 top-4 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-lg">
                                {discount}% OFF
                              </div>
                            )}
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
        className="absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex md:border-neutral-300 md:bg-white/80 md:text-neutral-900 md:hover:bg-white md:focus-visible:outline-neutral-900 lg:left-6"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex md:border-neutral-300 md:bg-white/80 md:text-neutral-900 md:hover:bg-white md:focus-visible:outline-neutral-900 lg:right-6"
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
                    "relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-[width] duration-300 md:bg-neutral-900/20",
                    isActive ? "w-10" : "w-5 hover:bg-white/40 md:hover:bg-neutral-900/40",
                  )}
                >
                  {isActive && (
                    <motion.span
                      key={`progress-${selected}-${progressKey}`}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                      className="absolute inset-y-0 left-0 block bg-white md:bg-neutral-900"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="font-mono text-xs tracking-widest text-white/70 tabular-nums md:text-neutral-700">
            {String(selected + 1).padStart(2, "0")}
            <span className="mx-1 text-white/30 md:text-neutral-400">/</span>
            {String(total).padStart(2, "0")}
          </div>
        </div>
      </div>
    </section>
  );
}
