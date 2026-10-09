import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { FaFacebookF } from "react-icons/fa";
import { JsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/lib/site-url";
import { getSiteSettings } from "@/lib/site-settings";
import { getSeoSettings } from "@/lib/seo-settings";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/site/contact-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Eid Bazar support — message us, call, WhatsApp or Facebook.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [site, seo, session] = await Promise.all([getSiteSettings(), getSeoSettings().catch(() => null), auth()]);
  const me = session?.user
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true } })
    : null;
  const tel = site.supportPhone.replace(/[^\d+]/g, "");
  const cards = [
    site.supportPhone && { icon: Phone, title: "Call us", value: site.supportPhone, href: `tel:${tel}` },
    site.whatsappUrl && { icon: MessageCircle, title: "WhatsApp", value: "Chat on WhatsApp", href: site.whatsappUrl },
    site.supportEmail && { icon: Mail, title: "E-mail", value: site.supportEmail, href: `mailto:${site.supportEmail}` },
    site.facebookUrl && {
      icon: FaFacebookF,
      title: "Facebook",
      value: site.facebookUrl.replace(/^https?:\/\/(www\.)?/, ""),
      href: site.facebookUrl,
    },
    site.address && { icon: MapPin, title: "Address", value: site.address },
    site.supportHours && { icon: Clock, title: "Support hours", value: site.supportHours },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; title: string; value: string; href?: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: seo?.siteName || "Eid Bazar",
    url: siteUrl(),
    ...(site.supportEmail ? { email: site.supportEmail } : {}),
    ...(site.supportPhone ? { telephone: site.supportPhone } : {}),
    ...(site.address ? { address: { "@type": "PostalAddress", streetAddress: site.address, addressCountry: "BD" } } : {}),
    sameAs: [site.facebookUrl, site.instagramUrl, site.whatsappUrl].filter(Boolean),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={jsonLd} />
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Contact us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A question about a product or an order? Send us a message and we&apos;ll reply by phone or e-mail.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Send a message</h2>
          <ContactForm defaults={{ name: me?.name ?? "", email: me?.email?.endsWith(".invalid") ? "" : (me?.email ?? ""), phone: me?.phone ?? "" }} />
        </section>
        <ul className="grid content-start gap-3">
          {cards.map(({ icon: Icon, title, value, href }) => {
            const inner = (
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{title}</div>
                  <div className="truncate text-sm text-muted-foreground">{value}</div>
                </div>
              </div>
            );
            return (
              <li key={title}>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="block rounded-lg border bg-card p-4 transition hover:border-foreground/30"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="rounded-lg border bg-card p-4">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
