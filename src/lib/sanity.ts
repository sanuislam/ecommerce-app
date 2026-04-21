import { createClient, type ClientConfig } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>["image"]>[0];

export const sanityConfig: ClientConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-10-01",
  useCdn: true,
  perspective: "published",
};

export const sanityClient = createClient(sanityConfig);

const builder = imageUrlBuilder(sanityClient);
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export type SanityBanner = {
  _id: string;
  title: string;
  subtitle?: string;
  image?: { asset: { _ref: string } };
  ctaLabel?: string;
  ctaHref?: string;
};

export async function getBanners(): Promise<SanityBanner[]> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID === "placeholder" ||
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID === "your-sanity-project-id") {
    return [];
  }
  try {
    return await sanityClient.fetch<SanityBanner[]>(
      `*[_type == "banner" && !(_id in path("drafts.**"))] | order(order asc)`,
    );
  } catch {
    return [];
  }
}
