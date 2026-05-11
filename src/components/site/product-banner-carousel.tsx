"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
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
      className="relative isolate overflow-hidden border-b bg-neutral-950 text-white md:bg-gradient-to-br md:from-rose-50/70 md:via-white md:to-amber-50/60 md:text-neutral-900"
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

                {/* Desktop: editorial split — text 5/12, image 7/12 */}
                <div className="relative hidden h-[clamp(520px,72vh,720px)] w-full md:block">
                  {/* Decorative gradient washes */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-rose-300/30 blur-[120px]"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-32 bottom-0 h-[32rem] w-[32rem] rounded-full bg-amber-300/30 blur-[120px]"
                  />
                  {/* Subtle dotted grain overlay */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgb(15_23_42)_1px,transparent_1px)] [background-size:18px_18px]"
                  />

                  <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-12 items-center gap-10 px-6 lg:gap-16 lg:px-10">
                    {/* Left: editorial text */}
                    <AnimatePresence mode="wait">
                      {active && (
                        <motion.div
                          key={`d-text-${p.id}`}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{
                            duration: 0.6,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="col-span-5 space-y-6"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-rose-700/80">
                            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-rose-500" />
                            <span>
                              Eid Bazar Picks
                              {p.category?.name ? ` · ${p.category.name}` : ""}
                            </span>
                          </div>

                          <h1 className="text-balance font-semibold leading-[1.02] tracking-tight text-neutral-900 text-[clamp(2.4rem,4.4vw,4.4rem)]">
                            {p.name}
                          </h1>

                          {p.description && (
                            <p className="line-clamp-3 max-w-md text-base leading-relaxed text-neutral-600 lg:text-lg">
                              {p.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-1">
                            <span className="bg-gradient-to-br from-neutral-900 to-neutral-700 bg-clip-text text-[clamp(2rem,3vw,3rem)] font-bold leading-none tracking-tight text-transparent">
                              {formatPrice(p.price)}
                            </span>
                            {p.compareAt && p.compareAt > p.price && (
                              <>
                                <span className="text-xl text-neutral-400 line-through lg:text-2xl">
                                  {formatPrice(p.compareAt)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                  <Sparkles className="size-3" />
                                  Save {formatPrice(p.compareAt - p.price)}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-3">
                            <Button
                              asChild
                              size="lg"
                              className="group h-12 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 px-7 text-base font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/40 hover:brightness-105"
                            >
                              <Link href={`/products/${p.slug}`}>
                                Shop now
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="lg"
                              variant="outline"
                              className="h-12 rounded-full border-neutral-300 bg-white/80 px-6 text-base font-medium text-neutral-800 backdrop-blur hover:bg-white"
                            >
                              <Link href="/products?featured=1">
                                View collection
                              </Link>
                            </Button>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Truck className="size-3.5 text-rose-500" />
                              Free over ৳1,000
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <ShieldCheck className="size-3.5 text-rose-500" />
                              Authentic
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <RefreshCcw className="size-3.5 text-rose-500" />
                              7-day returns
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Right: dramatic product showcase */}
                    <AnimatePresence mode="wait">
                      {active && (
                        <motion.div
                          key={`d-img-${p.id}`}
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{
                            duration: 0.7,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="relative col-span-7 flex h-full items-center justify-center"
                        >
                          {/* Tilted decorative gradient card behind */}
                          <div
                            aria-hidden
                            className="absolute right-6 top-1/2 h-[78%] w-[78%] -translate-y-1/2 rotate-[6deg] rounded-[2.5rem] bg-gradient-to-br from-rose-500 via-rose-400 to-amber-400 opacity-90 shadow-[0_30px_80px_-20px_rgba(244,63,94,0.45)]"
                          />
                          {/* Soft white frame */}
                          <div className="relative aspect-square w-full max-w-[34rem] overflow-hidden rounded-[2rem] bg-white p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] ring-1 ring-black/5 lg:max-w-[36rem]">
                            <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-neutral-50 to-neutral-100">
                              {image ? (
                                <motion.div
                                  key={`d-zoom-${p.id}-${progressKey}`}
                                  initial={{ scale: 1.02 }}
                                  animate={{ scale: 1.08 }}
                                  transition={{
                                    duration: AUTOPLAY_MS / 1000 + 1,
                                    ease: "linear",
                                  }}
                                  className="absolute inset-0"
                                >
                                  <Image
                                    src={image}
                                    alt={p.name}
                                    fill
                                    priority={idx === 0}
                                    sizes="(min-width: 1024px) 36rem, (min-width: 768px) 30rem, 100vw"
                                    className="object-cover"
                                  />
                                </motion.div>
                              ) : (
                                <div className="absolute inset-0 bg-neutral-100" />
                              )}
                            </div>

                            {discount > 0 && (
                              <div className="absolute -left-3 -top-3 flex size-20 rotate-[-8deg] items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-rose-500 text-center font-bold text-white shadow-xl shadow-rose-500/30 ring-4 ring-white">
                                <div className="leading-none">
                                  <div className="text-2xl">{discount}%</div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                                    Off
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Floating trust pill */}
                            <div className="absolute -bottom-4 right-6 flex items-center gap-2 rounded-full border border-white/60 bg-white/95 px-3 py-2 shadow-xl ring-1 ring-black/5 backdrop-blur">
                              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <ShieldCheck className="size-4" />
                              </span>
                              <div className="pr-1 leading-tight">
                                <div className="text-[11px] font-semibold text-neutral-900">
                                  In stock · Ships in 24h
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                                  Dhaka & nationwide
                                </div>
                              </div>
                            </div>
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
