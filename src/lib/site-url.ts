/**
 * The site's public origin (no trailing slash), used for canonical URLs,
 * sitemaps, structured data and payment callbacks.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL — set this once you have a custom domain
 *   2. Vercel's production domain (provided automatically on Vercel)
 *   3. NEXT_PUBLIC_APP_URL (legacy) unless it points at localhost on Vercel
 *   4. The current Vercel deployment URL, then localhost for development
 */
export function siteUrl(): string {
  const clean = (v?: string) => (v ? v.trim().replace(/\/+$/, "") : "");
  const withProto = (v: string) => (/^https?:\/\//.test(v) ? v : `https://${v}`);
  const onVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  const explicit = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return withProto(explicit);

  const production = clean(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  );
  if (production) return withProto(production);

  const legacy = clean(process.env.NEXT_PUBLIC_APP_URL);
  if (legacy && !(onVercel && /localhost|127\.0\.0\.1/.test(legacy))) return withProto(legacy);

  const deployment = clean(process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL);
  if (deployment) return withProto(deployment);

  return "http://localhost:3000";
}
