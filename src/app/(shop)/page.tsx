import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getBanners } from "@/lib/sanity";
import { getSeoSettings } from "@/lib/seo-settings";
import { HomeHero } from "@/components/site/home-hero";
import { ProductBannerCarousel } from "@/components/site/product-banner-carousel";
import { CategoryCards } from "@/components/site/category-cards";
import { FlashDeals } from "@/components/site/flash-deals";
import { SpeciallyForYou } from "@/components/site/specially-for-you";
import { Testimonials } from "@/components/site/testimonials";
import { TrustStrip } from "@/components/site/trust-strip";
import { Newsletter } from "@/components/site/newsletter";
import { CARD_INCLUDE, toCardProduct } from "@/lib/product-view";
import { getShippingConfig } from "@/lib/checkout";
import { formatPrice } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  const ogImages = [{ url: seo.defaultOgImage || "/og-default.png" }];
  return {
    title: { absolute: seo.defaultTitle },
    description: seo.defaultDescription,
    alternates: { canonical: "/" },
    openGraph: {
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      url: "/",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function HomePage() {
  const [featured, latest, categories, banners, dealsRaw, speciallyRaw, shipping] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, featured: true },
      include: { category: { select: { name: true } }, ...CARD_INCLUDE },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { published: true },
      include: CARD_INCLUDE,
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      take: 12,
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
      include: CARD_INCLUDE,
      take: 12,
      orderBy: [{ createdAt: "desc" }],
    }),
    getShippingConfig(),
  ]);

  const speciallyForYou = speciallyRaw.map((p) => {
    const c = toCardProduct(p);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      price: c.price,
      compareAt: c.compareAt ?? null,
      stock: p.stock,
      images: c.images,
      hasVariants: c.hasVariants ?? false,
    };
  });

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
    price: toCardProduct(p).price,
    compareAt: toCardProduct(p).compareAt ?? null,
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

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            {
              icon: Truck,
              title: shipping.freeThreshold > 0 ? "Free delivery" : "Nationwide delivery",
              text:
                shipping.freeThreshold > 0
                  ? `On orders over ${formatPrice(shipping.freeThreshold)} across Bangladesh`
                  : "Cash on delivery across all 64 districts",
              bg: "from-emerald-50 to-teal-100/60 dark:from-emerald-950/40 dark:to-teal-900/30",
              ring: "ring-emerald-200/70 dark:ring-emerald-800/50",
              iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
            },
            {
              icon: ShieldCheck,
              title: "Secure payments",
              text: "bKash, Nagad, Rocket, Upay or cash on delivery",
              bg: "from-sky-50 to-indigo-100/60 dark:from-sky-950/40 dark:to-indigo-900/30",
              ring: "ring-sky-200/70 dark:ring-sky-800/50",
              iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
            },
            {
              icon: RotateCcw,
              title: "Easy returns",
              text: "See our refund policy for details",
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {latest.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="about-shop">
        <div className="rounded-2xl border bg-muted/30 p-5 sm:p-8">
          <h2 id="about-shop" className="text-xl font-semibold tracking-tight sm:text-2xl">
            Online Eid shopping in Bangladesh
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Eid Bazar brings your whole Eid list to one place — men&apos;s panjabi and kurta,
            sarees, three-piece and salwar kameez, abaya and hijab, kids&apos; Eid outfits,
            footwear, attar and perfume, watches, prayer essentials, home decor and Eid gifts.
            Order online and pay with cash on delivery, bKash, Nagad, Rocket or Upay. We deliver
            to all 64 districts, with faster delivery inside Dhaka.
          </p>
          {categories.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="inline-flex h-9 items-center rounded-full border bg-background px-3 hover:border-foreground/40"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Testimonials />
      <TrustStrip />
      <Newsletter />
    </div>
  );
}
