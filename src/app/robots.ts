import type { MetadataRoute } from "next";

const BASE_URL = "https://eidbazar.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/studio",
          "/studio/",
          "/sign-in",
          "/sign-up",
          "/checkout",
          "/orders",
          "/cart",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
