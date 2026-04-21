import Link from "next/link";
import { FaFacebookF, FaGithub, FaInstagram } from "react-icons/fa";
import { Mail } from "lucide-react";
import { SITE_CONFIG } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold">{SITE_CONFIG.name}</h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Modern commerce experiences with a beautiful, accessible UI.
          </p>
          <div className="mt-4 flex items-center gap-3 text-muted-foreground">
            <a
              href={SITE_CONFIG.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="hover:text-foreground"
            >
              <FaFacebookF className="size-5" />
            </a>
            <a
              href={`mailto:${SITE_CONFIG.supportEmail}`}
              aria-label="Email us"
              className="hover:text-foreground"
            >
              <Mail className="size-5" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="hover:text-foreground"
            >
              <FaInstagram className="size-5" />
            </a>
            <a href="#" aria-label="GitHub" className="hover:text-foreground">
              <FaGithub className="size-5" />
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <a
              href={`mailto:${SITE_CONFIG.supportEmail}`}
              className="hover:text-foreground"
            >
              {SITE_CONFIG.supportEmail}
            </a>
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/products" className="hover:text-foreground">
                All products
              </Link>
            </li>
            <li>
              <Link
                href="/products?featured=1"
                className="hover:text-foreground"
              >
                Featured
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-foreground">
                My orders
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/studio" className="hover:text-foreground">
                Content studio
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Legal</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/privacy-policy" className="hover:text-foreground">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-foreground">
                Terms & conditions
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="hover:text-foreground">
                Refund policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE_CONFIG.name}. Built with Next.js.
      </div>
    </footer>
  );
}
