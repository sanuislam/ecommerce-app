import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { FaFacebookF } from "react-icons/fa";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact — Eid Bazar",
  description: "Get in touch with Eid Bazar support.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Contact us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re here to help. Reach out via email or Facebook and we&apos;ll
          get back to you shortly.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${SITE_CONFIG.supportEmail}`}
          className="group rounded-lg border bg-card p-5 transition hover:border-foreground/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <Mail className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Email support</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground">
                {SITE_CONFIG.supportEmail}
              </div>
            </div>
          </div>
        </a>

        <a
          href={SITE_CONFIG.facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="group rounded-lg border bg-card p-5 transition hover:border-foreground/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <FaFacebookF className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Facebook</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground">
                {SITE_CONFIG.facebookUrl.replace(/^https?:\/\//, "")}
              </div>
            </div>
          </div>
        </a>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <Phone className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Phone</div>
              <div className="text-sm text-muted-foreground">
                {SITE_CONFIG.phone}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <MapPin className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Address</div>
              <div className="text-sm text-muted-foreground">
                {SITE_CONFIG.address}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
