import Link from "next/link";
import { BD_DISTRICTS } from "@/lib/districts";
import { SEGMENTS, SEGMENT_IDS, type Audience } from "@/lib/segments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Audience query string (for links between Customers and Campaigns). */
export function audienceQuery(a: Audience, extra: Record<string, string> = {}) {
  const sp = new URLSearchParams();
  if (a.segment !== "all") sp.set("segment", a.segment);
  if (a.segment === "new" || a.segment === "active" || a.segment === "lapsed") sp.set("days", String(a.days));
  if (a.segment === "vip") sp.set("minSpent", String(a.minSpent));
  if (a.district) sp.set("district", a.district);
  if (a.categoryId) sp.set("categoryId", a.categoryId);
  for (const [k, v] of Object.entries(extra)) if (v) sp.set(k, v);
  return sp.toString();
}

const sel = "h-9 rounded-md border bg-background px-2 text-sm";

/** Segment chips + filters, as a plain GET form. */
export function AudienceForm({
  action,
  audience: a,
  categories,
  search = false,
  hidden = {},
}: {
  action: string;
  audience: Audience;
  categories: { id: string; name: string }[];
  search?: boolean;
  hidden?: Record<string, string>;
}) {
  const needsDays = a.segment === "new" || a.segment === "active" || a.segment === "lapsed";
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {SEGMENT_IDS.map((s) => (
          <Link
            key={s}
            href={`${action}?${audienceQuery({ ...a, segment: s, days: s === "lapsed" ? 60 : 30 }, hidden)}`}
            title={SEGMENTS[s].hint}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              a.segment === s ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {SEGMENTS[s].label}
          </Link>
        ))}
      </div>
      <form method="get" action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="segment" value={a.segment} />
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        {needsDays ? (
          <label className="grid gap-1 text-xs text-muted-foreground">
            Days
            <Input name="days" type="number" min={1} max={730} defaultValue={a.days} className="h-9 w-24" />
          </label>
        ) : null}
        {a.segment === "vip" ? (
          <label className="grid gap-1 text-xs text-muted-foreground">
            Spent at least (৳)
            <Input name="minSpent" type="number" min={0} defaultValue={a.minSpent} className="h-9 w-32" />
          </label>
        ) : null}
        <label className="grid gap-1 text-xs text-muted-foreground">
          District
          <select name="district" defaultValue={a.district} className={sel}>
            <option value="">Any district</option>
            {BD_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Bought from
          <select name="categoryId" defaultValue={a.categoryId} className={sel}>
            <option value="">Any category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {search ? (
          <label className="grid gap-1 text-xs text-muted-foreground">
            Search
            <Input name="q" defaultValue={a.q} placeholder="Name, e-mail or phone" className="h-9 w-52" />
          </label>
        ) : null}
        <Button type="submit" variant="secondary" size="sm" className="h-9">
          Apply
        </Button>
      </form>
    </div>
  );
}
