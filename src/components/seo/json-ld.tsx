/**
 * Server-rendered JSON-LD. Rendered into the initial HTML (unlike next/script,
 * which injects inline scripts on the client) so crawlers see it immediately.
 * `<` is escaped so product text can never break out of the script tag.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
