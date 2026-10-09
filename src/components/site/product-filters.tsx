"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { buildQuery, listOf, SORTS, type FilterState } from "@/lib/product-filters";

export type Facets = { size: { value: string; count: number }[]; color: { value: string; count: number }[] };

/** Sort + price + availability filters, rendered as a plain GET form. */
function FilterForm({ state, facets, onDone }: { state: FilterState; facets: Facets; onDone?: () => void }) {
  const [sizes, setSizes] = useState(() => new Set(listOf(state.size)));
  const [colors, setColors] = useState(() => new Set(listOf(state.color)));
  const [showAllSizes, setShowAllSizes] = useState(false);
  const toggle = (set: Set<string>, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };
  return (
    <form action="/products" className="space-y-6" onSubmit={onDone}>
      {state.q && <input type="hidden" name="q" value={state.q} />}
      {state.category && <input type="hidden" name="category" value={state.category} />}
      {state.featured && <input type="hidden" name="featured" value={state.featured} />}
      {state.tag && <input type="hidden" name="tag" value={state.tag} />}
      {sizes.size ? <input type="hidden" name="size" value={[...sizes].join(",")} /> : null}
      {colors.size ? <input type="hidden" name="color" value={[...colors].join(",")} /> : null}

      {facets.size.length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Size</legend>
          <div className="flex flex-wrap gap-1.5">
            {(showAllSizes ? facets.size : facets.size.slice(0, 12)).map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={sizes.has(f.value)}
                onClick={() => setSizes((s) => toggle(s, f.value))}
                className={cn(
                  "h-9 min-w-10 rounded-md border px-2.5 text-sm transition",
                  sizes.has(f.value) ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground/40",
                )}
              >
                {f.value}
              </button>
            ))}
            {facets.size.length > 12 && !showAllSizes ? (
              <button type="button" onClick={() => setShowAllSizes(true)} className="h-9 px-2 text-sm underline">
                +{facets.size.length - 12} more
              </button>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {facets.color.length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Colour</legend>
          <div className="space-y-1">
            {facets.color.map((f) => (
              <label key={f.value} className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={colors.has(f.value)}
                  onChange={() => setColors((s) => toggle(s, f.value))}
                  className="size-4 accent-primary"
                />
                {f.value}
                <span className="text-xs text-muted-foreground">({f.count})</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Sort by</legend>
        <div className="space-y-1">
          {SORTS.map((o) => (
            <label key={o.k} className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="radio"
                name="sort"
                value={o.k}
                defaultChecked={(state.sort ?? "") === o.k}
                className="size-4 accent-primary"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Price (৳)</legend>
        <div className="flex items-center gap-2">
          <Label htmlFor="min" className="sr-only">Minimum price</Label>
          <Input id="min" name="min" type="number" min={0} inputMode="numeric" placeholder="Min" defaultValue={state.min} />
          <span className="text-muted-foreground">–</span>
          <Label htmlFor="max" className="sr-only">Maximum price</Label>
          <Input id="max" name="max" type="number" min={0} inputMode="numeric" placeholder="Max" defaultValue={state.max} />
        </div>
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="mb-2 text-sm font-semibold">Show</legend>
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="instock" value="1" defaultChecked={state.instock === "1"} className="size-4 accent-primary" />
          In stock only
        </label>
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="sale" value="1" defaultChecked={state.sale === "1"} className="size-4 accent-primary" />
          On sale
        </label>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Apply</Button>
        <Button asChild variant="outline">
          <Link href={buildQuery({ q: state.q, category: state.category, tag: state.tag })} onClick={onDone}>
            Reset
          </Link>
        </Button>
      </div>
    </form>
  );
}

export function DesktopFilters({ state, facets }: { state: FilterState; facets: Facets }) {
  return <FilterForm state={state} facets={facets} />;
}

export function MobileFilterButton({ state, active, facets }: { state: FilterState; active: number; facets: Facets }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("shrink-0", active > 0 && "border-primary")}>
          <SlidersHorizontal className="size-4" />
          Filter & sort
          {active > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{active}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle>Filter & sort</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <FilterForm state={state} facets={facets} onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
