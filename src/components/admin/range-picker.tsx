import Link from "next/link";
import { PRESETS, type Range } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Preset chips + a custom from/to form (plain GET, no JavaScript needed). */
export function RangePicker({ action, range }: { action: string; range: Range }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(PRESETS).map(([k, label]) => (
        <Link
          key={k}
          href={`${action}?preset=${k}`}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition",
            range.preset === k ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
          )}
        >
          {label}
        </Link>
      ))}
      <form method="get" action={action} className="flex flex-wrap items-center gap-1.5 text-xs">
        <input
          type="date"
          name="from"
          defaultValue={range.from}
          aria-label="From"
          className="h-8 rounded-md border bg-background px-2"
        />
        <span className="text-muted-foreground">to</span>
        <input type="date" name="to" defaultValue={range.to} aria-label="To" className="h-8 rounded-md border bg-background px-2" />
        <Button type="submit" size="sm" variant={range.preset === "custom" ? "default" : "outline"} className="h-8">
          Apply
        </Button>
      </form>
    </div>
  );
}
