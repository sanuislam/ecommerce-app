import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DesktopFilters, MobileFilterButton } from "@/components/site/product-filters";
import { buildQuery, type FilterState } from "@/lib/product-filters";
import { getSeoSettings } from "@/lib/seo-settings";
import { CARD_INCLUDE, toCardProduct } from "@/lib/product-view";
import { absoluteUrl, cn } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma";

const PAGE_SIZE = 24;

export const revalidate = 30;

type Props = {
  searchParams: Promise<FilterState & { page?: string }>;
};

async function resolveCategoryName(slug: string | undefined) {
  if (!slug) return null;
  const c = await prisma.category.findUnique({ where: { slug } });
  return c?.name ?? null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const { q, category, featured } = sp;
  const seo = await getSeoSettings();
  const categoryName = await resolveCategoryName(category);

  const titleParts: string[] = [];
  if (categoryName) titleParts.push(categoryName);
  if (featured === "1" && !categoryName) titleParts.push("Featured");
  if (q) titleParts.push(`Search “${q}”`);
  const base = categoryName
    ? `${categoryName}${q ? ` · “${q}”` : ""} — Buy Online in Bangladesh`
    : titleParts.length > 0
      ? `${titleParts.join(" · ")} — Shop Online`
      : sp.sale === "1"
        ? "Eid Deals & Discounts — Shop Online"
        : "All Products — Eid Shopping Online in Bangladesh";

  const categoryRow = category
    ? await prisma.category.findUnique({ where: { slug: category }, select: { description: true } })
    : null;
  const description = categoryName
    ? `${categoryRow?.description ? categoryRow.description.trim().replace(/\.?$/, ". ") : ""}Shop ${categoryName} online at ${seo.siteName} — best prices in Bangladesh, cash on delivery in all 64 districts, mobile banking accepted.`
    : q
      ? `Search results for “${q}” on ${seo.siteName}. Authentic products, fair prices, and fast delivery across Bangladesh.`
      : `Browse the full ${seo.siteName} catalog. Authentic products, fair prices, and fast delivery across Bangladesh.`;

  // Category listings live at /category/<slug>; the rest canonicalise to
  // /products (plus the deals / featured views). Searches and filtered or
  // paginated views are kept out of the index to avoid thin duplicates.
  const tag = sp.tag ? sp.tag.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) : "";
  const canonical = category
    ? `/category/${category}`
    : tag
      ? `/products?tag=${tag}`
      : sp.sale === "1"
      ? "/products?sale=1"
      : featured === "1"
        ? "/products?featured=1"
        : "/products";
  const filtered = Boolean(q || sp.sort || sp.min || sp.max || sp.instock || (sp.page && sp.page !== "1"));

  const ogImages = [{ url: seo.defaultOgImage || "/og-default.png" }];

  return {
    title: base,
    description,
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${base} | ${seo.siteName}`,
      description,
      url: canonical,
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${base} | ${seo.siteName}`,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const state: FilterState = {
    q: sp.q?.trim() || undefined,
    category: sp.category || undefined,
    featured: sp.featured === "1" ? "1" : undefined,
    sale: sp.sale === "1" ? "1" : undefined,
    instock: sp.instock === "1" ? "1" : undefined,
    min: sp.min && Number(sp.min) > 0 ? String(Number(sp.min)) : undefined,
    max: sp.max && Number(sp.max) > 0 ? String(Number(sp.max)) : undefined,
    sort: sp.sort || undefined,
    tag: sp.tag ? sp.tag.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || undefined : undefined,
  };
  const { q, category, featured, sort } = state;
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const seo = await getSeoSettings();

  const and: Prisma.ProductWhereInput[] = [{ published: true }];
  if (featured) and.push({ featured: true });
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { tags: { has: q.toLowerCase() } },
      ],
    });
  }
  if (state.tag) and.push({ tags: { has: state.tag } });
  if (category) and.push({ category: { slug: category } });
  if (state.sale) {
    and.push({ OR: [{ flashDeal: true, flashDealDiscount: { gt: 0 } }, { compareAt: { not: null } }] });
  }
  if (state.instock) and.push({ stock: { gt: 0 } });
  if (state.min || state.max) {
    and.push({
      price: {
        ...(state.min ? { gte: Number(state.min) } : {}),
        ...(state.max ? { lte: Number(state.max) } : {}),
      },
    });
  }
  const where: Prisma.ProductWhereInput = { AND: and };

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "price-asc"
      ? [{ price: "asc" }]
      : sort === "price-desc"
        ? [{ price: "desc" }]
        : sort === "name"
          ? [{ name: "asc" }]
          : [{ createdAt: "desc" }];

  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [...orderBy, { id: "asc" }],
      include: CARD_INCLUDE,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryName = category
    ? categories.find((c) => c.slug === category)?.name ?? null
    : null;
  const activeFilters = [state.sale, state.instock, state.min, state.max, state.sort].filter(Boolean).length;

  const itemListJsonLd = seo.jsonLdEnabled && products.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: categoryName
          ? `${categoryName} — ${seo.siteName}`
          : q
            ? `Search results for “${q}” — ${seo.siteName}`
            : `All products — ${seo.siteName}`,
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
          "@type": "ListItem",
          position: (page - 1) * PAGE_SIZE + i + 1,
          url: absoluteUrl(`/products/${p.slug}`),
          name: p.name,
          image: p.images[0] ?? undefined,
        })),
      }
    : null;

  const breadcrumbJsonLd = seo.jsonLdEnabled
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Products", item: absoluteUrl("/products") },
          ...(categoryName
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: categoryName,
                  item: absoluteUrl(`/category/${category}`),
                },
              ]
            : []),
        ],
      }
    : null;

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-foreground/40",
    );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      {itemListJsonLd && (
        <JsonLd data={itemListJsonLd} />
      )}
      {breadcrumbJsonLd && (
        <JsonLd data={breadcrumbJsonLd} />
      )}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {categoryName
              ? categoryName
              : state.tag
                ? `#${state.tag}`
                : q
                ? `Results for “${q}”`
                : state.sale
                  ? "Deals"
                  : featured
                    ? "Featured"
                    : "All products"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "item" : "items"}
          </p>
        </div>
        <form action="/products" className="flex w-full gap-2 sm:max-w-sm" role="search">
          {category && <input type="hidden" name="category" value={category} />}
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products..."
            aria-label="Search products"
          />
        </form>
      </div>

      {/* Mobile / tablet: category chips + filter sheet */}
      <div className="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
        <MobileFilterButton state={state} active={activeFilters} />
        <Link href={buildQuery({ ...state, category: undefined })} className={chip(!category)}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={buildQuery({ ...state, category: c.slug })}
            className={chip(category === c.slug)}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden space-y-8 lg:block">
          <nav aria-label="Categories">
            <h2 className="mb-3 text-sm font-semibold">Categories</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href={buildQuery({ ...state, category: undefined })}
                  className={!category ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                >
                  All
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={buildQuery({ ...state, category: c.slug })}
                    className={
                      category === c.slug
                        ? "font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <DesktopFilters state={state} />
        </aside>

        <div className="min-w-0">
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground sm:p-12">
              <p>No products match your filters.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/products">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={toCardProduct(p)} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
              <Button asChild variant="outline" disabled={page <= 1}>
                <Link
                  href={`${buildQuery(state)}${buildQuery(state).includes("?") ? "&" : "?"}page=${page - 1}`}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                >
                  <ChevronLeft className="size-4" /> Prev
                </Link>
              </Button>
              <span className="px-2 text-sm text-muted-foreground tabular-nums">
                Page {page} of {pages}
              </span>
              <Button asChild variant="outline">
                <Link
                  href={`${buildQuery(state)}${buildQuery(state).includes("?") ? "&" : "?"}page=${page + 1}`}
                  aria-disabled={page >= pages}
                  className={page >= pages ? "pointer-events-none opacity-50" : undefined}
                >
                  Next <ChevronRight className="size-4" />
                </Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
