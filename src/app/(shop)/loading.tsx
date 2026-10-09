import { ShoppingBag } from "lucide-react";

export default function Loading() {
  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-gold-50 to-gold-50 dark:from-brand-950/40 dark:via-gold-950/30 dark:to-gold-950/30"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="relative mb-8 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-400 to-gold-500 text-white shadow-lg">
          <span
            aria-hidden
            className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-brand-400/40 blur-2xl"
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl ring-2 ring-brand-300/50"
          />
          <ShoppingBag className="size-9 animate-pulse" />
        </div>

        <div className="mb-2 text-lg font-semibold tracking-tight">
          Loading <span className="text-brand-500">Eid Bazar</span>…
        </div>
        <div className="mb-8 text-sm text-muted-foreground">
          Hand-picked products are on the way.
        </div>

        <div className="relative h-1.5 w-56 overflow-hidden rounded-full bg-muted">
          <div className="absolute inset-y-0 -left-1/3 w-1/3 animate-[loading-bar_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-gold-500" />
        </div>

        <div className="mt-12 grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="aspect-square animate-pulse bg-muted" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-8 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
