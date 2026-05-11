import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { getSeoSettings } from "@/lib/seo-settings";
import type { Prisma } from "@/generated/prisma";

export const revalidate = 30;

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    featured?: string;
    sort?: string;
  }>;
};

async function resolveCategoryName(slug: string | undefined) {
  if (!slug) return null;
  const c = await prisma.category.findUnique({ where: { slug } });
  return c?.name ?? null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, category, featured } = await searchParams;
  const seo = await getSeoSettings();
  const categoryName = await resolveCategoryName(category);

  const titleParts: string[] = [];
  if (categoryName) titleParts.push(categoryName);
  if (featured === "1" && !categoryName) titleParts.push("Featured");
  if (q) titleParts.push(`Search “${q}”`);
  const base =
    titleParts.length > 0
      ? `${titleParts.join(" · ")} — All products`
      : "All products";

  const description = categoryName
    ? `Shop ${categoryName.toLowerCase()} at ${seo.siteName}. Authentic products, fair prices, and fast delivery across Bangladesh.`
    : q
      ? `Search results for “${q}” on ${seo.siteName}. Authentic products, fair prices, and fast delivery across Bangladesh.`
      : `Browse the full ${seo.siteName} catalog. Authentic products, fair prices, and fast delivery across Bangladesh.`;

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (featured) params.set("featured", featured);
  if (q) params.set("q", q);
  const search = params.toString();
  const canonical = search ? `/products?${search}` : "/products";

  const ogImages = seo.defaultOgImage ? [{ url: seo.defaultOgImage }] : [];

  return {
    title: base,
    description,
    alternates: { canonical },
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
  const { q, category, featured, sort } = await searchParams;
  const seo = await getSeoSettings();

  const where: Prisma.ProductWhereInput = { published: true };
  if (featured === "1") where.featured = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) {
    where.category = { slug: category };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy, take: 60 }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const categoryName = category
    ? categories.find((c) => c.slug === category)?.name ?? null
    : null;

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
          position: i + 1,
          url: `https://eidbazar.com/products/${p.slug}`,
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
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://eidbazar.com/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Products",
            item: "https://eidbazar.com/products",
          },
          ...(categoryName
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: categoryName,
                  item: `https://eidbazar.com/products?category=${category}`,
                },
              ]
            : []),
        ],
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {itemListJsonLd && (
        <Script id="ld-itemlist" type="application/ld+json">
          {JSON.stringify(itemListJsonLd)}
        </Script>
      )}
      {breadcrumbJsonLd && (
        <Script id="ld-breadcrumb" type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </Script>
      )}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {categoryName
              ? categoryName
              : q
                ? `Search results for “${q}”`
                : "All products"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? "item" : "items"}
          </p>
        </div>
        <form action="/products" className="flex w-full max-w-sm gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products..."
          />
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Categories</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href="/products"
                  className={!category ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                >
                  All
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/products?category=${c.slug}`}
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
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Sort</h3>
            <ul className="space-y-1 text-sm">
              {[
                { k: "", label: "Newest" },
                { k: "price-asc", label: "Price: low to high" },
                { k: "price-desc", label: "Price: high to low" },
              ].map((opt) => (
                <li key={opt.k}>
                  <Link
                    href={`/products?${new URLSearchParams({
                      ...(category ? { category } : {}),
                      ...(q ? { q } : {}),
                      ...(featured ? { featured } : {}),
                      ...(opt.k ? { sort: opt.k } : {}),
                    }).toString()}`}
                    className={
                      (sort ?? "") === opt.k
                        ? "font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    {opt.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div>
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No products found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: Number(p.price),
                    compareAt: p.compareAt != null ? Number(p.compareAt) : null,
                    images: p.images,
                    featured: p.featured,
                    stock: p.stock,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
