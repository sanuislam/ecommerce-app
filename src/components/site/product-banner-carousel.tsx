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
      className="relative isolate overflow-hidden border-b bg-gradient-to-b from-rose-50/70 via-white to-amber-50/60 text-neutral-900 md:bg-gradient-to-br md:from-rose-50/70 md:via-white md:to-amber-50/60"
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
                {/* Mobile: premium image-on-top + frosted content card below */}
                <div className="relative w-full md:hidden">
                  {/* Image stage */}
                  <div className="relative h-[clamp(320px,48vh,460px)] w-full overflow-hidden bg-neutral-100">
                    {image ? (
                      <motion.div
                        key={active ? `m-active-${idx}-${progressKey}` : `m-idle-${idx}`}
                        initial={{ scale: 1.06 }}
                        animate={{ scale: active ? 1.12 : 1.06 }}
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
                      <div className="absolute inset-0 bg-neutral-200" />
                    )}

                    {/* Soft gradient toward the bottom so the frosted card peeks out cleanly */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                    {/* Top-left eyebrow chip on the image */}
                    <AnimatePresence mode="wait">
                      {active && (
                        <motion.div
                          key={`m-top-${p.id}`}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md"
                        >
                          <span className="inline-flex size-1.5 animate-pulse rounded-full bg-rose-400" />
                          Eid Bazar Picks{p.category?.name ? ` · ${p.category.name}` : ""}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Top-right discount badge */}
                    {discount > 0 && (
                      <div className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-rose-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-500/30 ring-2 ring-white/70">
                        Save {discount}%
                      </div>
                    )}
                  </div>

                  {/* Frosted content card lifted over the image */}
                  <div className="relative -mt-10 px-4 pb-8">
                    <AnimatePresence mode="wait">
                      {active && (
                        <motion.div
                          key={`m-${p.id}`}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                          className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/95 px-5 pb-5 pt-5 text-neutral-900 shadow-2xl shadow-black/20 ring-1 ring-black/5 backdrop-blur-xl"
                        >
                          {/* Subtle rose→amber accent in the corner */}
                          <div
                            aria-hidden
                            className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-gradient-to-br from-rose-300/40 to-amber-300/40 blur-2xl"
                          />

                          <h2 className="text-balance line-clamp-2 text-[clamp(1.4rem,5.4vw,1.9rem)] font-semibold leading-[1.15] tracking-tight">
                            {p.name}
                          </h2>

                          <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                            <span className="bg-gradient-to-br from-neutral-900 to-neutral-700 bg-clip-text text-3xl font-bold leading-none tracking-tight text-transparent">
                              {formatPrice(p.price)}
                            </span>
                            {p.compareAt && p.compareAt > p.price && (
                              <>
                                <span className="text-base text-neutral-400 line-through">
                                  {formatPrice(p.compareAt)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                  <Sparkles className="size-3" />
                                  Save {formatPrice(p.compareAt - p.price)}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <Button
                              asChild
                              size="lg"
                              className="group h-11 flex-1 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/40 hover:brightness-105"
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
                              className="h-11 rounded-full border-neutral-300 px-4 text-sm font-medium text-neutral-800"
                            >
                              <Link href="/products?featured=1">Browse</Link>
                            </Button>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
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
                              7-day
                            </span>
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

                          <h1 className="text-balance line-clamp-2 font-semibold leading-[1.02] tracking-tight text-neutral-900 text-[clamp(2.2rem,4vw,4rem)]">
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

                            {/* Floating trust pill — anchored left to avoid the Tawk chat launcher in the bottom-right corner of the viewport */}
                            <div className="absolute -bottom-4 left-6 flex items-center gap-2 rounded-full border border-white/60 bg-white/95 px-3 py-2 shadow-xl ring-1 ring-black/5 backdrop-blur">
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
        className="absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white/80 text-neutral-900 backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 md:inline-flex lg:left-6"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white/80 text-neutral-900 backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 md:inline-flex lg:right-6"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 pb-3 sm:px-6 md:pb-5 lg:px-8">
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
                    "relative h-1.5 overflow-hidden rounded-full bg-neutral-900/20 transition-[width] duration-300",
                    isActive ? "w-10" : "w-5 hover:bg-neutral-900/40",
                  )}
                >
                  {isActive && (
                    <motion.span
                      key={`progress-${selected}-${progressKey}`}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                      className="absolute inset-y-0 left-0 block bg-neutral-900"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="font-mono text-xs tracking-widest text-neutral-700 tabular-nums">
            {String(selected + 1).padStart(2, "0")}
            <span className="mx-1 text-neutral-400">/</span>
            {String(total).padStart(2, "0")}
          </div>
        </div>
      </div>
    </section>
  );
}
