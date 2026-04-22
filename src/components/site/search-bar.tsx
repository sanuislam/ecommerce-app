"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
};

function SearchBarInner({ className, autoFocus, onSubmitted }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    if (pathname === "/products") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = value.trim();
    const url = q ? `/products?q=${encodeURIComponent(q)}` : "/products";
    router.push(url);
    onSubmitted?.();
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={`relative flex items-center ${className ?? ""}`}
    >
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products..."
        aria-label="Search products"
        autoFocus={autoFocus}
        className="h-9 w-full pl-9 pr-9"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => setValue("")}
          className="absolute right-1 size-7"
        >
          <X className="size-4" />
        </Button>
      )}
    </form>
  );
}

function SearchBarFallback({ className }: Pick<SearchBarProps, "className">) {
  return (
    <div className={`relative flex items-center ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search products..."
        aria-label="Search products"
        disabled
        className="h-9 w-full pl-9 pr-9"
      />
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
