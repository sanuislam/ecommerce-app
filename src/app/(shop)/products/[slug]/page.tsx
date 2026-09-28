import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { notFound } from "next/navigation";
import { Star, Truck, ShieldCheck, Tag, RotateCcw, Banknote } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, formatDate, formatPrice } from "@/lib/utils";
import { getSeoSettings } from "@/lib/seo-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { getShippingConfig } from "@/lib/checkout";
import { unitPrice } from "@/lib/pricing";
import { offerValidUntil } from "@/lib/seo-helpers";
import { CARD_INCLUDE, toCardProduct } from "@/lib/product-view";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { ReviewForm } from "@/components/review-form";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
    include: { category: { select: { name: true } } },
  });
  if (!p || !p.published) return { title: "Product not found", robots: { index: false } };
  const seo = await getSeoSettings();
  const price = unitPrice(p);
  const plain = p.description.replace(/\s+/g, " ").trim();
  // Lead with price + delivery so the snippet sells, then the description.
  const desc = `${formatPrice(price)} · ${p.category ? `${p.category.name} · ` : ""}Cash on delivery across Bangladesh. ${plain}`.slice(0, 158);
  const url = absoluteUrl(`/products/${p.slug}`);
  const images = (p.images.length ? p.images.slice(0, 4) : [seo.defaultOgImage || "/og-default.png"]).map(
    (u) => ({ url: u, alt: p.name }),
  );
  const title = p.category ? `${p.name} — ${p.category.name}` : p.name;
  return {
    title,
    description: desc,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      type: "website",
      title,
      description: desc,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: images.map((i) => i.url),
    },
    other: {
      "product:price:amount": price.toFixed(2),
      "product:price:currency": "BDT",
      "product:availability": p.stock > 0 ? "in stock" : "out of stock",
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { orderBy: { position: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!product || !product.published) notFound();

  const session = await auth();
  const [seo, site, shipping, ratingAgg, related, delivered] = await Promise.all([
    getSeoSettings(),
    getSiteSettings(),
    getShippingConfig(),
    prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.product.findMany({
      where: {
        published: true,
        id: { not: product.id },
        ...(product.categoryId ? { categoryId: product.categoryId } : {}),
      },
      include: CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    session?.user
      ? prisma.orderItem.findFirst({
          where: {
            productId: product.id,
            order: { userId: session.user.id, status: "DELIVERED" },
          },
          select: { id: true },
        })
      : null,
  ]);
  const avg = ratingAgg._avg.rating;
  const reviewCount = ratingAgg._count;
  const myReview = session?.user
    ? product.reviews.find((r) => r.userId === session.user.id)
    : undefined;
  const productUrl = absoluteUrl(`/products/${product.slug}`);

  const availability = (stock: number) =>
    stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const priceValidUntil = offerValidUntil();
  const merchantExtras = {
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: seo.siteName },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "BD" },
      shippingRate: {
        "@type": "MonetaryAmount",
        value: Math.min(shipping.insideDhaka, shipping.outsideDhaka),
        currency: "BDT",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 5, unitCode: "DAY" },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "BD",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
    },
  };
  const variantPrices = product.variants.map((v) => unitPrice(product, v));
  const offers =
    product.variants.length > 0
      ? {
          "@type": "AggregateOffer",
          url: productUrl,
          priceCurrency: "BDT",
          lowPrice: Math.min(...variantPrices).toFixed(2),
          highPrice: Math.max(...variantPrices).toFixed(2),
          offerCount: product.variants.length,
          availability: availability(product.stock),
          ...merchantExtras,
        }
      : {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "BDT",
          price: unitPrice(product).toFixed(2),
          priceValidUntil,
          availability: availability(product.stock),
          ...merchantExtras,
        };
  const productJsonLd = seo.jsonLdEnabled
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.images,
        sku: product.id,
        url: productUrl,
        brand: { "@type": "Brand", name: seo.siteName },
        ...(product.category ? { category: product.category.name } : {}),
        offers,
        ...(avg && reviewCount > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: avg.toFixed(1),
                reviewCount,
              },
              review: product.reviews.slice(0, 5).map((r) => ({
                "@type": "Review",
                reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
                author: { "@type": "Person", name: r.user.name ?? "Customer" },
                datePublished: r.createdAt.toISOString().slice(0, 10),
                ...(r.comment ? { reviewBody: r.comment } : {}),
              })),
            }
          : {}),
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
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Products",
            item: absoluteUrl("/products"),
          },
          ...(product.category
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: product.category.name,
                  item: absoluteUrl(`/category/${product.category.slug}`),
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: product.category ? 4 : 3,
            name: product.name,
            item: productUrl,
          },
        ],
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 lg:px-8 lg:pb-12">
      {productJsonLd && (
        <JsonLd data={productJsonLd} />
      )}
      {breadcrumbJsonLd && (
        <JsonLd data={breadcrumbJsonLd} />
      )}
      <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center text-sm text-muted-foreground sm:mb-6">
        <Link href="/" className="shrink-0 hover:text-foreground">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/products" className="shrink-0 hover:text-foreground">Products</Link>
        {product.category && (
          <>
            <span className="mx-1">/</span>
            <Link
              href={`/category/${product.category.slug}`}
              className="truncate hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <ProductGallery images={product.images} name={product.name} />

        <div className="min-w-0 space-y-4">
          {product.category && (
            <Badge variant="secondary">
              <Tag className="size-3" />
              {product.category.name}
            </Badge>
          )}
          <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {product.name}
          </h1>
          <a href="#reviews" className="flex w-fit items-center gap-2">
            <div className="flex items-center gap-0.5 text-amber-500" aria-hidden>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={
                    avg && i <= Math.round(avg)
                      ? "size-4 fill-current"
                      : "size-4 text-muted-foreground/40"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {avg ? `${avg.toFixed(1)} · ${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
            </span>
          </a>

          <AddToCart
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              image: product.images[0],
              price: Number(product.price),
              compareAt: product.compareAt != null ? Number(product.compareAt) : null,
              flashDeal: product.flashDeal,
              flashDealDiscount: product.flashDealDiscount,
              stock: product.stock,
            }}
            variants={product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              price: v.price != null ? Number(v.price) : null,
              stock: v.stock,
            }))}
            whatsappUrl={site.whatsappUrl}
            productUrl={productUrl}
          />

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-md border bg-card p-3">
              <Truck className="size-4 shrink-0" />
              {shipping.freeThreshold > 0
                ? `Free delivery over ${formatPrice(shipping.freeThreshold)}`
                : `Delivery from ${formatPrice(Math.min(shipping.insideDhaka, shipping.outsideDhaka))}`}
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-card p-3">
              <Banknote className="size-4 shrink-0" />
              Cash on delivery available
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-card p-3">
              <ShieldCheck className="size-4 shrink-0" />
              bKash, Nagad, Rocket &amp; Upay
            </div>
            <Link
              href="/refund-policy"
              className="flex items-center gap-2 rounded-md border bg-card p-3 hover:text-foreground"
            >
              <RotateCcw className="size-4 shrink-0" />
              Easy returns
            </Link>
          </div>

          <div className="pt-2">
            <h2 className="mb-2 text-sm font-semibold">Description</h2>
            <p className="text-sm leading-6 whitespace-pre-line text-muted-foreground">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      <section id="reviews" className="mt-12 scroll-mt-20 sm:mt-14">
        <Separator />
        <h2 className="mt-8 text-xl font-semibold tracking-tight sm:mt-10 sm:text-2xl">
          Reviews {reviewCount > 0 && <span className="text-muted-foreground">({reviewCount})</span>}
        </h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            {product.reviews.length === 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                No reviews yet. Customers can review a product once it has been delivered.
              </p>
            )}
            {product.reviews.map((r) => (
              <article key={r.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex text-amber-500" aria-label={`${r.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={i <= r.rating ? "size-4 fill-current" : "size-4 text-muted-foreground/40"}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.user.name ?? "Customer"}</span>
                  <span className="text-xs text-muted-foreground">· {formatDate(r.createdAt)}</span>
                </div>
                {r.title && <div className="mt-2 text-sm font-medium">{r.title}</div>}
                {r.comment && (
                  <p className="mt-1 text-sm break-words whitespace-pre-line text-muted-foreground">
                    {r.comment}
                  </p>
                )}
                <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Verified purchase</div>
              </article>
            ))}
          </div>
          <div>
            {delivered ? (
              <ReviewForm
                slug={product.slug}
                initial={
                  myReview
                    ? { rating: myReview.rating, title: myReview.title ?? "", comment: myReview.comment ?? "" }
                    : undefined
                }
              />
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {session?.user ? (
                  "You can write a review after this product is delivered to you."
                ) : (
                  <>
                    <Link href={`/sign-in?callbackUrl=/products/${product.slug}`} className="font-medium text-foreground underline">
                      Sign in
                    </Link>{" "}
                    to review products you have bought.
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12 sm:mt-14">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
