"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Search, Tag, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

type SearchBarProps = {
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
};

type Suggest = {
  products: { name: string; slug: string; image: string | null; price: number; inStock: boolean }[];
  categories: { name: string; slug: string }[];
};

function SearchBarInner({ className, autoFocus, onSubmitted }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");
  const [data, setData] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const seq = useRef(0);

  useEffect(() => {
    if (pathname === "/products") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  // Suggestions while typing (debounced; the newest answer wins).
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;
    const n = ++seq.current;
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Suggest | null) => {
          if (n !== seq.current) return;
          setData(d);
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => n === seq.current && setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [value]);

  const items: { href: string; key: string }[] = [
    ...(data?.products ?? []).map((p) => ({ href: `/products/${p.slug}`, key: `p:${p.slug}` })),
    ...(data?.categories ?? []).map((c) => ({ href: `/category/${c.slug}`, key: `c:${c.slug}` })),
  ];
  const showList = open && value.trim().length >= 2 && !!data;

  function go(href: string) {
    setOpen(false);
    router.push(href);
    onSubmitted?.();
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (showList && active >= 0 && items[active]) return go(items[active].href);
    const q = value.trim();
    go(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={`relative flex items-center ${className ?? ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(-1, a - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search products..."
        aria-label="Search products"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        className="h-9 w-full pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {loading ? (
        <Loader2 className="absolute right-9 size-4 animate-spin text-muted-foreground" />
      ) : null}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            setData(null);
          }}
          className="absolute right-1 size-7"
        >
          <X className="size-4" />
        </Button>
      )}
      {showList ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[70dvh] overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
        >
          {items.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No matches. Press Enter to search everything.</div>
          ) : null}
          {data!.products.map((p, i) => (
            <Link
              key={p.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={active === i}
              href={`/products/${p.slug}`}
              onClick={() => go(`/products/${p.slug}`)}
              className={`flex items-center gap-3 rounded-md p-2 text-sm ${active === i ? "bg-muted" : "hover:bg-muted"}`}
            >
              <span className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
                {p.image ? <Image src={p.image} alt="" fill sizes="40px" className="object-cover" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPrice(p.price)}
                  {p.inStock ? "" : " · Out of stock"}
                </span>
              </span>
            </Link>
          ))}
          {data!.categories.map((c, j) => {
            const i = data!.products.length + j;
            return (
              <Link
                key={c.slug}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active === i}
                href={`/category/${c.slug}`}
                onClick={() => go(`/category/${c.slug}`)}
                className={`flex items-center gap-2 rounded-md p-2 text-sm ${active === i ? "bg-muted" : "hover:bg-muted"}`}
              >
                <Tag className="size-4 text-muted-foreground" /> {c.name}
              </Link>
            );
          })}
          <button type="submit" className="w-full rounded-md p-2 text-left text-sm font-medium hover:bg-muted">
            See all results for “{value.trim()}”
          </button>
        </div>
      ) : null}
    </form>
  );
}

function SearchBarFallback({ className }: Pick<SearchBarProps, "className">) {
  return (
    <div className={`relative flex items-center ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input type="search" placeholder="Search products..." aria-label="Search products" disabled className="h-9 w-full pl-9 pr-9" />
    </div>
  );
}

export function SearchBar(props: SearchBarProps) {
  return (
    <Suspense fallback={<SearchBarFallback className={props.className} />}>
      <SearchBarInner {...props} />
    </Suspense>
  );
}
