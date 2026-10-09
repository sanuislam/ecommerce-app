"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShieldCheck,
  Truck,
  RefreshCcw,
  Sparkles,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

export type BannerProduct = {
  id: string;
  name: string;
  slug: string;
  /** Final price (flash deals applied). */
  price: number;
  /** Strike-through price, if discounted. */
  compareAt: number | null;
  images: string[];
  description?: string | null;
  category?: { name: string } | null;
  stock: number;
};

const AUTOPLAY_MS = 5500;
const EASE = [0.22, 1, 0.36, 1] as const;

// prefers-reduced-motion, read without a hydration mismatch.
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

function stockLabel(stock: number) {
  if (stock <= 0) return "Sold out";
  if (stock <= 5) return `Only ${stock} left`;
  return "In stock";
}

export function ProductBannerCarousel({
  products,
  freeShippingThreshold = 0,
  returnDays = null,
}: {
  products: BannerProduct[];
  /** From admin settings; 0 = no free-delivery offer. */
  freeShippingThreshold?: number;
  /** Return window in days, or null when returns are off. */
  returnDays?: number | null;
}) {
  const reducedMotion = useReducedMotion();
  const multiple = products.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: multiple, align: "start", duration: 32, active: multiple },
    multiple
      ? [
          Autoplay({
            delay: AUTOPLAY_MS,
            playOnInit: !reducedMotion,
            stopOnInteraction: false,
            // Hover / focus pausing is handled below so a user's explicit
            // pause is never overridden by the plugin resuming on mouseleave.
            stopOnMouseEnter: false,
            stopOnFocusIn: false,
          }),
        ]
      : [],
  );
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  // Bumped whenever a slide becomes active (replays its entrance) or the
  // autoplay timer restarts (restarts the progress bar).
  const [enterKey, setEnterKey] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  // User pressed pause — stays paused until they press play.
  const [userPaused, setUserPaused] = useState(false);

  const scrollTo = useCallback((idx: number) => emblaApi?.scrollTo(idx), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onInit = () => setSnapCount(emblaApi.scrollSnapList().length);
    const onSelect = () => {
      setSelected(emblaApi.selectedScrollSnap());
      setEnterKey((k) => k + 1);
    };
    const onTimerSet = () => {
      setTimerKey((k) => k + 1);
      setTimerRunning(true);
    };
    const onTimerStopped = () => setTimerRunning(false);
    onInit();
    onSelect();
    // The first timer may have started before we subscribed.
    if (emblaApi.plugins()?.autoplay?.isPlaying()) onTimerSet();
    emblaApi.on("reInit", onInit);
    emblaApi.on("select", onSelect);
    emblaApi.on("autoplay:timerset", onTimerSet);
    emblaApi.on("autoplay:timerstopped", onTimerStopped);
    return () => {
      emblaApi.off("reInit", onInit);
      emblaApi.off("select", onSelect);
      emblaApi.off("autoplay:timerset", onTimerSet);
      emblaApi.off("autoplay:timerstopped", onTimerStopped);
    };
  }, [emblaApi]);

  // Respect reduced-motion changes after load.
  useEffect(() => {
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay) return;
    if (reducedMotion || userPaused) autoplay.stop();
  }, [emblaApi, reducedMotion, userPaused]);

  const togglePlay = () => {
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay) return;
    if (userPaused) {
      setUserPaused(false);
      autoplay.play();
    } else {
      setUserPaused(true);
      autoplay.stop();
    }
  };

  // Hovering / focusing pauses autoplay; resume afterwards unless the user paused.
  const pauseForInteraction = () => emblaApi?.plugins()?.autoplay?.stop();
  const resumeIfAllowed = () => {
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (autoplay && !userPaused && !reducedMotion && !autoplay.isPlaying()) autoplay.play();
  };

  if (products.length === 0) return null;
  const total = products.length;
  const animate = !reducedMotion;

  const trustItems = [
    {
      icon: Truck,
      text:
        freeShippingThreshold > 0
          ? `Free delivery over ${formatPrice(freeShippingThreshold).replace(".00", "")}`
          : "Delivery across Bangladesh",
    },
    { icon: Banknote, text: "Cash on delivery" },
    ...(returnDays ? [{ icon: RefreshCcw, text: `${returnDays}-day returns` }] : []),
  ];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") scrollPrev();
        if (e.key === "ArrowRight") scrollNext();
      }}
      onMouseEnter={pauseForInteraction}
      onMouseLeave={resumeIfAllowed}
      onFocus={pauseForInteraction}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resumeIfAllowed();
      }}
      className="relative isolate overflow-hidden border-b bg-gradient-to-b from-brand-50/70 via-background to-gold-50/60 text-foreground md:bg-gradient-to-br"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {products.map((p, idx) => {
            const active = idx === selected;
            const image = p.images[0];
            const discount =
              p.compareAt != null && p.compareAt > p.price
                ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100)
                : 0;
            // Only the active slide replays its entrance; neighbours stay fully
            // rendered so they are visible while swiping.
            const enter = active && animate
              ? { key: `on-${enterKey}`, initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }
              : { key: "off", initial: false as const, animate: { opacity: 1, y: 0 } };
            const soldOut = p.stock <= 0;

            return (
              <div
                key={p.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${total}: ${p.name}`}
                className="relative min-w-0 flex-[0_0_100%]"
                aria-hidden={!active}
                inert={!active}
              >
                {/* ---------- Phone: image on top, card below ---------- */}
                <div className="relative w-full md:hidden">
                  <div className="relative h-[clamp(240px,40vh,400px)] w-full overflow-hidden bg-muted">
                    {image ? (
                      <motion.div
                        key={active ? `m-zoom-${enterKey}` : "m-still"}
                        initial={{ scale: 1.04 }}
                        animate={{ scale: active && animate ? 1.1 : 1.04 }}
                        transition={{ duration: active && animate ? AUTOPLAY_MS / 1000 + 1 : 0, ease: "linear" }}
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
                      <div className="absolute inset-0 bg-muted" />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                    <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
                      {p.category?.name ? (
                        <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-white uppercase backdrop-blur-md">
                          <span className="inline-flex size-1.5 shrink-0 rounded-full bg-brand-400" />
                          <span className="truncate">{p.category.name}</span>
                        </span>
                      ) : (
                        <span />
                      )}
                      {discount > 0 && (
                        <span className="shrink-0 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-[11px] font-bold tracking-wider text-white uppercase shadow-lg ring-2 shadow-brand-500/30 ring-white/70">
                          Save {discount}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative -mt-10 px-4 pb-12">
                    <motion.div
                      key={enter.key}
                      initial={enter.initial}
                      animate={enter.animate}
                      transition={{ duration: 0.55, ease: EASE }}
                      className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/95 px-5 pt-5 pb-5 text-foreground shadow-2xl ring-1 shadow-black/20 ring-black/5 backdrop-blur-xl"
                    >
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-gradient-to-br from-brand-300/40 to-gold-300/40 blur-2xl"
                      />
                      {/* Fixed two-line height keeps the page from jumping between slides. */}
                      <h2 className="line-clamp-2 min-h-[2.3em] text-[clamp(1.25rem,5.4vw,1.75rem)] leading-[1.15] font-semibold tracking-tight text-balance">
                        {p.name}
                      </h2>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[clamp(1.5rem,7vw,1.875rem)] leading-none font-bold tracking-tight">
                          {formatPrice(p.price)}
                        </span>
                        {discount > 0 && (
                          <span className="text-base text-muted-foreground/70 line-through">
                            {formatPrice(p.compareAt!)}
                          </span>
                        )}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            soldOut
                              ? "bg-muted text-muted-foreground"
                              : p.stock <= 5
                                ? "bg-gold-100 text-gold-800"
                                : "bg-emerald-100 text-emerald-700",
                          )}
                        >
                          {stockLabel(p.stock)}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          asChild
                          size="lg"
                          className="group h-11 flex-1 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-gold-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-105"
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
                          className="h-11 rounded-full border-brand-200 px-4 text-sm font-medium text-foreground"
                        >
                          <Link href="/products?featured=1">Browse</Link>
                        </Button>
                      </div>

                      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-brand-100 pt-3 text-[11px] font-medium text-muted-foreground">
                        {trustItems.map(({ icon: Icon, text }) => (
                          <li key={text} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Icon className="size-3.5 text-brand-500" />
                            {text}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>
                </div>

                {/* ---------- Tablet / desktop: text + image split ---------- */}
                <div className="relative hidden h-[clamp(520px,72vh,700px)] w-full md:block">
                  <div aria-hidden className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-brand-300/30 blur-[120px]" />
                  <div aria-hidden className="pointer-events-none absolute -right-32 bottom-0 h-[32rem] w-[32rem] rounded-full bg-gold-300/30 blur-[120px]" />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(15_23_42)_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.07]"
                  />

                  {/* pb-16 keeps the content clear of the controls bar. */}
                  <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-12 items-center gap-8 px-6 pt-8 pb-16 lg:gap-14 lg:px-10">
                    <motion.div
                      key={`d-${enter.key}`}
                      initial={enter.initial}
                      animate={enter.animate}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="col-span-6 space-y-5 lg:col-span-5"
                    >
                      {p.category?.name && (
                        <div className="flex items-center gap-2 text-xs font-medium tracking-[0.22em] text-brand-700/80 uppercase">
                          <span className="inline-flex size-1.5 rounded-full bg-brand-500" />
                          <span className="truncate">{p.category.name}</span>
                        </div>
                      )}

                      <h2 className="line-clamp-2 text-[clamp(2rem,3.6vw,3.75rem)] leading-[1.05] font-semibold tracking-tight text-balance text-foreground">
                        {p.name}
                      </h2>

                      {p.description && (
                        <p className="line-clamp-3 max-w-md text-base leading-relaxed text-muted-foreground lg:text-lg">
                          {p.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                        <span className="text-[clamp(1.75rem,3vw,3rem)] leading-none font-bold tracking-tight">
                          {formatPrice(p.price)}
                        </span>
                        {discount > 0 && (
                          <>
                            <span className="text-xl text-muted-foreground/70 line-through lg:text-2xl">
                              {formatPrice(p.compareAt!)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-gold-800 uppercase">
                              <Sparkles className="size-3" />
                              Save {formatPrice(p.compareAt! - p.price).replace(".00", "")}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button
                          asChild
                          size="lg"
                          className="group h-12 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-gold-500 px-7 text-base font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-105"
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
                          className="h-12 rounded-full border-brand-200 bg-white/80 px-6 text-base font-medium text-foreground backdrop-blur hover:bg-white"
                        >
                          <Link href="/products?featured=1">View collection</Link>
                        </Button>
                      </div>

                      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs font-medium text-muted-foreground">
                        {trustItems.map(({ icon: Icon, text }) => (
                          <li key={text} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Icon className="size-3.5 text-brand-500" />
                            {text}
                          </li>
                        ))}
                      </ul>
                    </motion.div>

                    <div className="relative col-span-6 flex h-full items-center justify-center lg:col-span-7">
                      <div
                        aria-hidden
                        className="absolute top-1/2 right-6 h-[78%] w-[78%] -translate-y-1/2 rotate-[6deg] rounded-[2.5rem] bg-gradient-to-br from-brand-500 via-brand-400 to-gold-400 opacity-90 shadow-[0_30px_80px_-20px_rgba(216,31,74,0.4)]"
                      />
                      <div className="relative aspect-square h-[min(100%,34rem)] max-w-full overflow-hidden rounded-[2rem] bg-white p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
                        <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-brand-50 to-gold-50">
                          {image ? (
                            <motion.div
                              key={active ? `d-zoom-${enterKey}` : "d-still"}
                              initial={{ scale: 1.02 }}
                              animate={{ scale: active && animate ? 1.08 : 1.02 }}
                              transition={{ duration: active && animate ? AUTOPLAY_MS / 1000 + 1 : 0, ease: "linear" }}
                              className="absolute inset-0"
                            >
                              <Image
                                src={image}
                                alt={p.name}
                                fill
                                priority={idx === 0}
                                sizes="(min-width: 1024px) 36rem, 45vw"
                                className="object-cover"
                              />
                            </motion.div>
                          ) : null}
                        </div>

                        {discount > 0 && (
                          <div className="absolute top-3 left-3 flex size-20 rotate-[-8deg] items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-500 text-center font-bold text-white shadow-xl ring-4 shadow-brand-500/30 ring-white">
                            <div className="leading-none">
                              <div className="text-2xl">{discount}%</div>
                              <div className="text-[10px] font-semibold tracking-[0.14em] uppercase">Off</div>
                            </div>
                          </div>
                        )}

                        <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/60 bg-white/95 px-3 py-2 shadow-xl ring-1 ring-black/5 backdrop-blur">
                          <span
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full",
                              soldOut ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700",
                            )}
                          >
                            <ShieldCheck className="size-4" />
                          </span>
                          <div className="pr-1 leading-tight">
                            <div className="text-xs font-semibold text-foreground">{stockLabel(p.stock)}</div>
                            <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                              Cash on delivery
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Controls: dots · pause · prev/next · counter ---------- */}
      {multiple && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 pb-2 sm:px-6 md:pb-4 lg:px-10">
            <div className="pointer-events-auto flex items-center">
              {Array.from({ length: snapCount }, (_, idx) => {
                const isActive = idx === selected;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollTo(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={isActive}
                    // 24px-tall hit area around a thin bar.
                    className="group flex h-6 items-center px-0.5 sm:px-1"
                  >
                    <span
                      className={cn(
                        "relative block h-1.5 overflow-hidden rounded-full bg-brand-600/20 transition-[width] duration-300",
                        isActive ? "w-8 sm:w-10" : "w-3 group-hover:bg-brand-600/40 sm:w-5",
                      )}
                    >
                      {isActive && (
                        <span
                          key={`bar-${timerKey}-${selected}`}
                          className="absolute inset-y-0 left-0 block w-full origin-left bg-brand-600"
                          style={
                            timerKey === 0
                              ? { transform: "scaleX(0)" }
                              : {
                                  animation: `eb-hero-progress ${AUTOPLAY_MS}ms linear forwards`,
                                  animationPlayState: timerRunning ? "running" : "paused",
                                }
                          }
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={userPaused || reducedMotion ? "Play slideshow" : "Pause slideshow"}
                className="inline-flex size-9 items-center justify-center rounded-full border border-brand-200 bg-white/80 text-foreground backdrop-blur hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                {userPaused || reducedMotion ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="Previous slide"
                className="hidden size-9 items-center justify-center rounded-full border border-brand-200 bg-white/80 text-foreground backdrop-blur hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:inline-flex"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                aria-label="Next slide"
                className="hidden size-9 items-center justify-center rounded-full border border-brand-200 bg-white/80 text-foreground backdrop-blur hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:inline-flex"
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="ml-1 hidden font-mono text-xs tracking-widest text-muted-foreground tabular-nums min-[360px]:inline" aria-live={timerRunning ? "off" : "polite"}>
                {String(selected + 1).padStart(2, "0")}
                <span className="mx-1 text-muted-foreground/70">/</span>
                {String(total).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes eb-hero-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </section>
  );
}
