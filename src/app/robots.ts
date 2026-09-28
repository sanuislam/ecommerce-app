import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  // Keep preview deployments out of search results entirely.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/studio",
          "/sign-in",
          "/sign-up",
          "/checkout",
          "/cart",
          "/orders",
          "/account",
          "/wishlist",
          "/offline",
          // Filtered / sorted / searched listings are near-duplicates.
          "/products?*sort=",
          "/products?*q=",
          "/products?*min=",
          "/products?*max=",
          "/products?*page=",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
