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
import { Testimonials } from "@/components/site/testimonials";
import { TrustStrip } from "@/components/site/trust-strip";
import { Newsletter } from "@/components/site/newsletter";
import { CARD_INCLUDE, toCardProduct } from "@/lib/product-view";
import { getShippingConfig } from "@/lib/checkout";
import { formatPrice } from "@/lib/utils";
import { getStoreFacts } from "@/lib/store-facts";

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
  const [featured, latest, categories, banners, dealsRaw, speciallyRaw, shipping, facts, reviewsRaw] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, featured: true },
      include: { category: { select: { name: true } }, ...CARD_INCLUDE },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { published: true },
      include: CARD_INCLUDE,
      take: 16,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      take: 12,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: { where: { published: true } } } },
        // Best product photo, used when the category has no image of its own.
        products: {
          where: { published: true, images: { isEmpty: false } },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
          select: { images: true },
          take: 1,
        },
      },
    }),
    getBanners(),
    prisma.product.findMany({
      where: {
        published: true,
        flashDeal: true,
        flashDealDiscount: { gt: 0 },
      },
      include: CARD_INCLUDE,
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    // Best sellers: most ordered (in stock only).
    prisma.product.findMany({
      where: { published: true, stock: { gt: 0 }, orderItems: { some: {} } },
      include: CARD_INCLUDE,
      take: 8,
      orderBy: [{ orderItems: { _count: "desc" } }, { createdAt: "desc" }],
    }),
    getShippingConfig(),
    getStoreFacts(),
    // Real reviews (only buyers of a delivered order can write one).
    prisma.review.findMany({
      where: { rating: { gte: 4 }, comment: { not: null }, product: { published: true } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        user: { select: { firstName: true, name: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
  ]);
  const reviews = reviewsRaw
    .filter((r) => (r.comment ?? "").trim().length >= 10)
    .slice(0, 3)
    .map((r) => {
      const full = r.user.firstName || r.user.name || "Customer";
      return {
        id: r.id,
        rating: r.rating,
        text: (r.comment ?? "").trim(),
        name: full.split(" ")[0],
        product: r.product,
      };
    });
  const saleOver = facts.flashSaleOver;

  // Only categories with something to buy; image falls back to a product photo.
  const shopCategories = categories
    .filter((c) => c._count.products > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image || c.products[0]?.images[0] || null,
      productCount: c._count.products,
    }));

  const bestSellers = speciallyRaw;


  const flashDeals = dealsRaw.map(toCardProduct).slice(0, 4);
  // Don't show the same product twice on the page.
  const shown = new Set([...flashDeals.map((p) => p.id), ...featured.map((p) => p.id)]);
  const newArrivals = latest.filter((p) => !shown.has(p.id)).slice(0, 8);

  const bannerProducts = featured.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: toCardProduct(p).price,
    compareAt: toCardProduct(p).compareAt ?? null,
    stock: p.stock,
    images: p.images,
    description: p.description,
    category: p.category ? { name: p.category.name } : null,
  }));

  return (
    <div className="w-full">
      {bannerProducts.length > 0 ? (
        <>
          {/* The page's single h1; slide titles are h2. */}
          <h1 className="sr-only">{(await getSeoSettings()).siteName} — online Eid shopping in Bangladesh</h1>
          <ProductBannerCarousel
            products={bannerProducts}
            freeShippingThreshold={shipping.freeThreshold}
            returnDays={facts.returnsEnabled ? facts.returnDays : null}
          />
        </>
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
            },
            {
              icon: ShieldCheck,
              title: "Secure payments",
              text: facts.paymentText.charAt(0).toUpperCase() + facts.paymentText.slice(1),
            },
            {
              icon: RotateCcw,
              title: facts.returnsEnabled ? `${facts.returnDays}-day returns` : "Help after delivery",
              text: facts.returnsEnabled ? "Return or exchange from your order page" : "See our refund policy for details",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group flex items-start gap-3 rounded-xl bg-gradient-to-br from-brand-50 via-card to-gold-50 p-5 shadow-sm ring-1 ring-brand-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="rounded-lg bg-gradient-to-br from-brand-500 to-gold-500 p-2.5 text-white shadow-sm transition-transform group-hover:scale-110">
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

      <FlashDeals products={saleOver ? [] : flashDeals} endsAt={facts.flashSaleEndsAt} />

      {bestSellers.length >= 4 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Best sellers</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/products?sort=best">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}

      {shopCategories.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8" aria-labelledby="shop-by-category">
          <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
            <div>
              <h2 id="shop-by-category" className="text-2xl font-semibold tracking-tight">
                Shop by category
              </h2>
              <p className="text-sm text-muted-foreground">Find everything for Eid, all in one place.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/products">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <CategoryCards categories={shopCategories} />
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

      {newArrivals.length > 0 && (
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
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="about-shop">
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/60 to-gold-50/60 p-5 sm:p-8">
          <h2 id="about-shop" className="text-xl font-semibold tracking-tight sm:text-2xl">
            Online Eid shopping in Bangladesh
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Eid Bazar brings your whole Eid list to one place — men&apos;s panjabi and kurta,
            sarees, three-piece and salwar kameez, abaya and hijab, kids&apos; Eid outfits,
            footwear, attar and perfume, watches, prayer essentials, home decor and Eid gifts.
            Order online and pay with {facts.paymentText}. We deliver
            to all 64 districts, with faster delivery inside Dhaka.
          </p>
          {categories.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="inline-flex h-9 items-center rounded-full border bg-background px-3 hover:border-brand-300 hover:text-brand-700"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Testimonials reviews={reviews} />
      <TrustStrip facts={facts} />
      <Newsletter offer={facts.newsletterOffer} />
    </div>
  );
}
