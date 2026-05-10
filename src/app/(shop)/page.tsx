import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getBanners } from "@/lib/sanity";
import { HomeHero } from "@/components/site/home-hero";
import { ProductBannerCarousel } from "@/components/site/product-banner-carousel";
import { CategoryCards } from "@/components/site/category-cards";
import { FlashDeals } from "@/components/site/flash-deals";
import { SpeciallyForYou } from "@/components/site/specially-for-you";
import { Testimonials } from "@/components/site/testimonials";
import { TrustStrip } from "@/components/site/trust-strip";
import { Newsletter } from "@/components/site/newsletter";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, latest, categories, banners, dealsRaw, speciallyRaw] = await Promise.all([
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
    prisma.product.findMany({
      where: {
        published: true,
        flashDeal: true,
        flashDealDiscount: { gt: 0 },
      },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { published: true },
      take: 12,
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const speciallyForYou = speciallyRaw.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    compareAt: p.compareAt != null ? Number(p.compareAt) : null,
    stock: p.stock,
    images: p.images,
  }));

  const flashDeals = dealsRaw
    .filter((p) => p.flashDealDiscount != null && p.flashDealDiscount > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      flashDealDiscount: p.flashDealDiscount as number,
      images: p.images,
    }))
    .slice(0, 4);

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
              bg: "from-emerald-50 to-teal-100/60 dark:from-emerald-950/40 dark:to-teal-900/30",
              ring: "ring-emerald-200/70 dark:ring-emerald-800/50",
              iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
            },
            {
              icon: ShieldCheck,
              title: "Secure checkout",
              text: "256-bit SSL + Stripe payments",
              bg: "from-sky-50 to-indigo-100/60 dark:from-sky-950/40 dark:to-indigo-900/30",
              ring: "ring-sky-200/70 dark:ring-sky-800/50",
              iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
            },
            {
              icon: Sparkles,
              title: "30-day returns",
              text: "No questions asked",
              bg: "from-rose-50 to-amber-100/60 dark:from-rose-950/40 dark:to-amber-900/30",
              ring: "ring-rose-200/70 dark:ring-rose-800/50",
              iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
            },
          ].map(({ icon: Icon, title, text, bg, ring, iconBg }) => (
            <div
              key={title}
              className={`group flex items-start gap-3 rounded-xl bg-gradient-to-br ${bg} p-5 ring-1 ${ring} shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`rounded-lg p-2.5 ${iconBg} transition-transform group-hover:scale-110`}>
                <Icon className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FlashDeals products={flashDeals} />

      <SpeciallyForYou products={speciallyForYou} />

      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Shop by category</h2>
          </div>
          <CategoryCards
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              image: c.image,
            }))}
          />
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

      <Testimonials />
      <TrustStrip />
      <Newsletter />
    </div>
  );
}
