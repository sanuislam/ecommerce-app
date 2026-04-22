import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getBanners } from "@/lib/sanity";
import { HomeHero } from "@/components/site/home-hero";
import { ProductBannerCarousel } from "@/components/site/product-banner-carousel";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, latest, categories, banners] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, featured: true },
      include: { category: { select: { name: true } } },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { published: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      take: 8,
      orderBy: { name: "asc" },
    }),
    getBanners(),
  ]);

  const bannerProducts = featured.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    compareAt: p.compareAt != null ? Number(p.compareAt) : null,
    images: p.images,
    description: p.description,
    category: p.category ? { name: p.category.name } : null,
  }));

  return (
    <div className="w-full">
      {bannerProducts.length > 0 ? (
        <ProductBannerCarousel products={bannerProducts} />
      ) : (
        <HomeHero banners={banners} />
      )}

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Truck,
              title: "Free shipping",
              text: "On orders over ৳1,000 across Bangladesh",
            },
            {
              icon: ShieldCheck,
              title: "Secure checkout",
              text: "256-bit SSL + Stripe payments",
            },
            {
              icon: Sparkles,
              title: "30-day returns",
              text: "No questions asked",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-muted-foreground">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Shop by category</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((c, i) => {
              const gradients = [
                "from-rose-50 via-pink-50 to-rose-100 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-rose-900/40",
                "from-sky-50 via-blue-50 to-indigo-100 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-900/40",
                "from-emerald-50 via-teal-50 to-cyan-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-900/40",
                "from-amber-50 via-orange-50 to-rose-100 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-900/40",
                "from-violet-50 via-purple-50 to-fuchsia-100 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-900/40",
                "from-lime-50 via-green-50 to-emerald-100 dark:from-lime-950/40 dark:via-green-950/30 dark:to-emerald-900/40",
                "from-yellow-50 via-amber-50 to-orange-100 dark:from-yellow-950/40 dark:via-amber-950/30 dark:to-orange-900/40",
                "from-slate-50 via-gray-50 to-zinc-100 dark:from-slate-950/40 dark:via-gray-950/30 dark:to-zinc-900/40",
              ];
              const gradient = gradients[i % gradients.length];
              return (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  className={`group relative flex aspect-[4/3] items-end overflow-hidden rounded-lg border bg-gradient-to-br ${gradient} p-4 transition-all hover:shadow-md hover:-translate-y-0.5`}
                >
                  <span className="text-sm font-semibold text-foreground/90">{c.name}</span>
                  <ArrowRight className="absolute right-3 top-3 size-4 text-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Featured products</h2>
              <p className="text-sm text-muted-foreground">Hand-picked for the season.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/products?featured=1">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
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
        </section>
      )}

      {latest.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">New arrivals</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/products">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {latest.map((p) => (
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
        </section>
      )}
    </div>
  );
}
