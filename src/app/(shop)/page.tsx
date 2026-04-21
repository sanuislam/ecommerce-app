import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getBanners } from "@/lib/sanity";
import { HomeHero } from "@/components/site/home-hero";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, latest, categories, banners] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, featured: true },
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

  return (
    <div className="w-full">
      <HomeHero banners={banners} />

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
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-lg border bg-gradient-to-br from-muted/80 to-muted p-4 transition-all hover:shadow-md"
              >
                <span className="text-sm font-semibold">{c.name}</span>
                <ArrowRight className="absolute right-3 top-3 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
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
