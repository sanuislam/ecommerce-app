import type { MetadataRoute } from "next";
import { getPwaSettings } from "@/lib/pwa-settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getPwaSettings();
  const icons: MetadataRoute.Manifest["icons"] = [];
  if (s.icon192Url)
    icons.push({
      src: s.icon192Url,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    });
  if (s.icon512Url)
    icons.push({
      src: s.icon512Url,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    });
  if (s.maskableIconUrl)
    icons.push({
      src: s.maskableIconUrl,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    });
  if (icons.length === 0) {
    icons.push({
      src: "/favicon.ico",
      sizes: "any",
      type: "image/x-icon",
    });
  }
  return {
    name: s.appName,
    short_name: s.shortName,
    description: s.description,
    start_url: s.startUrl,
    display: s.display as "standalone" | "fullscreen" | "minimal-ui" | "browser",
    orientation: s.orientation as
      | "any"
      | "natural"
      | "landscape"
      | "portrait"
      | "portrait-primary"
      | "portrait-secondary"
      | "landscape-primary"
      | "landscape-secondary",
    background_color: s.backgroundColor,
    theme_color: s.themeColor,
    icons,
  };
}
