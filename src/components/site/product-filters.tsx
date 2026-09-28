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
import { buildQuery, SORTS, type FilterState } from "@/lib/product-filters";

/** Sort + price + availability filters, rendered as a plain GET form. */
function FilterForm({ state, onDone }: { state: FilterState; onDone?: () => void }) {
  return (
    <form action="/products" className="space-y-6" onSubmit={onDone}>
      {state.q && <input type="hidden" name="q" value={state.q} />}
      {state.category && <input type="hidden" name="category" value={state.category} />}
      {state.featured && <input type="hidden" name="featured" value={state.featured} />}

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
          <Link href={buildQuery({ q: state.q, category: state.category })} onClick={onDone}>
            Reset
          </Link>
        </Button>
      </div>
    </form>
  );
}

export function DesktopFilters({ state }: { state: FilterState }) {
  return <FilterForm state={state} />;
}

export function MobileFilterButton({ state, active }: { state: FilterState; active: number }) {
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
          <FilterForm state={state} onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
