import type { MetadataRoute } from "next";
import { getPwaSettings } from "@/lib/pwa-settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getPwaSettings();
  const icons: MetadataRoute.Manifest["icons"] = [
    {
      src: s.icon192Url || "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: s.icon512Url || "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: s.maskableIconUrl || "/icons/maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
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
