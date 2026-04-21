import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
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

export default async function ProductsPage({ searchParams }: Props) {
  const { q, category, featured, sort } = await searchParams;

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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">All products</h1>
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
