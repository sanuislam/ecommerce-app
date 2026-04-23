"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

type Testimonial = {
  name: string;
  location: string;
  rating: number;
  quote: string;
  avatarColor: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Rumana Akter",
    location: "Dhaka",
    rating: 5,
    quote:
      "Eid-এর আগে সময়মতো delivery পেয়েছি। প্রোডাক্ট কোয়ালিটি অসাধারণ, প্যাকেজিংও খুব সুন্দর।",
    avatarColor: "from-rose-400 to-pink-500",
  },
  {
    name: "Shakib Hasan",
    location: "Chattogram",
    rating: 5,
    quote:
      "Smooth checkout, bKash payment worked instantly, and the admin team replied within minutes. Highly recommended.",
    avatarColor: "from-sky-400 to-indigo-500",
  },
  {
    name: "Nusrat Jahan",
    location: "Sylhet",
    rating: 5,
    quote:
      "দাম কম, ক্যাশ অন ডেলিভারি অপশন আছে, আর কাপড়ের মান সত্যিই প্রিমিয়াম — আমি repeat customer এখন।",
    avatarColor: "from-emerald-400 to-teal-500",
  },
  {
    name: "Tanvir Rahman",
    location: "Rajshahi",
    rating: 4,
    quote:
      "Fast shipping across Bangladesh and easy returns. The website feels as polished as any international brand I use.",
    avatarColor: "from-amber-400 to-orange-500",
  },
];

export function Testimonials() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % TESTIMONIALS.length),
      6000,
    );
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[index];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 p-8 shadow-sm dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-rose-950/30 sm:p-12"
      >
        <Quote
          className="absolute -right-4 -top-4 size-32 text-violet-200/70 dark:text-violet-900/40"
          aria-hidden
        />
        <div className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
            Loved by thousands
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            What our customers say
          </h2>
        </div>
        <div className="relative mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="mb-4 flex justify-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-5 ${
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <p className="text-lg leading-relaxed text-foreground/90 sm:text-xl">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <div
                  className={`flex size-11 items-center justify-center rounded-full bg-gradient-to-br ${t.avatarColor} font-semibold text-white shadow-md`}
                >
                  {t.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.location}, Bangladesh
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show testimonial ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-violet-600 dark:bg-violet-300"
                    : "w-1.5 bg-violet-300 dark:bg-violet-800 hover:bg-violet-400"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
