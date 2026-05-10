import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { Star, Truck, ShieldCheck, Tag } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { getSeoSettings } from "@/lib/seo-settings";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug } });
  if (!p) return { title: "Product not found" };
  const seo = await getSeoSettings();
  const desc =
    p.description?.slice(0, 160) ?? seo.defaultDescription;
  const url = `https://eidbazar.com/products/${p.slug}`;
  const image = p.images[0] ?? seo.defaultOgImage ?? undefined;
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description: desc,
      url,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: p.name,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true, image: true } } },
      },
    },
  });

  if (!product || !product.published) notFound();

  const seo = await getSeoSettings();
  const avg =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
      : null;

  const hasDiscount =
    product.compareAt != null && Number(product.compareAt) > Number(product.price);

  const productJsonLd = seo.jsonLdEnabled
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.images,
        sku: product.id,
        brand: { "@type": "Brand", name: seo.siteName },
        offers: {
          "@type": "Offer",
          url: `https://eidbazar.com/products/${product.slug}`,
          priceCurrency: "BDT",
          price: Number(product.price).toFixed(2),
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
        ...(avg && product.reviews.length > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: avg.toFixed(1),
                reviewCount: product.reviews.length,
              },
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
            item: "https://eidbazar.com/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Products",
            item: "https://eidbazar.com/products",
          },
          ...(product.category
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: product.category.name,
                  item: `https://eidbazar.com/products?category=${product.category.slug}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: product.category ? 4 : 3,
            name: product.name,
            item: `https://eidbazar.com/products/${product.slug}`,
          },
        ],
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {productJsonLd && (
        <Script id="ld-product" type="application/ld+json">
          {JSON.stringify(productJsonLd)}
        </Script>
      )}
      {breadcrumbJsonLd && (
        <Script id="ld-breadcrumb" type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </Script>
      )}
      <div className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/products" className="hover:text-foreground">Products</Link>
        {product.category && (
          <>
            <span className="mx-1">/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div className="space-y-4">
          {product.category && (
            <Badge variant="secondary">
              <Tag className="size-3" />
              {product.category.name}
            </Badge>
          )}
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-500">
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
              {avg ? avg.toFixed(1) : "No reviews"}
              {product.reviews.length > 0 && ` · ${product.reviews.length} reviews`}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold">
              {formatPrice(Number(product.price))}
            </span>
            {hasDiscount && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(Number(product.compareAt))}
              </span>
            )}
            {product.stock > 0 ? (
              <Badge variant="secondary">In stock</Badge>
            ) : (
              <Badge variant="destructive">Out of stock</Badge>
            )}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {product.description}
          </p>

          <AddToCart
            product={{
              productId: product.id,
              name: product.name,
              slug: product.slug,
              price: Number(product.price),
              image: product.images[0],
              quantity: 1,
              stock: product.stock,
            }}
          />

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-md border bg-card p-3">
              <Truck className="size-4" />
              Free shipping over ৳1,000
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-card p-3">
              <ShieldCheck className="size-4" />
              Secure Stripe checkout
            </div>
          </div>
        </div>
      </div>

      {product.reviews.length > 0 && (
        <section className="mt-14">
          <Separator />
          <h2 className="mt-10 text-2xl font-semibold tracking-tight">Reviews</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {product.reviews.map((r) => (
              <div key={r.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={
                          i <= r.rating
                            ? "size-4 fill-current"
                            : "size-4 text-muted-foreground/40"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">
                    {r.user.name ?? "Anonymous"}
                  </span>
                </div>
                {r.title && <div className="mt-2 text-sm font-medium">{r.title}</div>}
                {r.comment && (
                  <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
