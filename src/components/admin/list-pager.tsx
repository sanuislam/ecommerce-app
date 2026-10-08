import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** GET search box for an admin list. */
export function ListSearch({ action, q, placeholder }: { action: string; q: string; placeholder: string }) {
  return (
    <form method="get" action={action} className="flex gap-2 sm:max-w-md">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" name="q" defaultValue={q} placeholder={placeholder} className="pl-8" aria-label="Search" />
      </div>
      <Button type="submit" variant="secondary">
        Search
      </Button>
      {q && (
        <Button asChild variant="ghost" size="icon" aria-label="Clear search">
          <Link href={action}>
            <X className="size-4" />
          </Link>
        </Button>
      )}
    </form>
  );
}

/** "1–50 of 230" and Previous / Next links. */
export function ListPager({
  action,
  q,
  page,
  pageSize,
  total,
  noun,
}: {
  action: string;
  q: string;
  page: number;
  pageSize: number;
  total: number;
  noun: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${action}?${s}` : action;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {total === 0 ? `0 ${noun}` : `${from}–${to} of ${total} ${noun}`}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page - 1)}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-muted-foreground tabular-nums">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page + 1)}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function listParams(sp: Record<string, string | string[] | undefined>) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return {
    q: one(sp.q).trim().slice(0, 100),
    page: Math.max(1, Math.min(10_000, Number.parseInt(one(sp.page), 10) || 1)),
  };
}
