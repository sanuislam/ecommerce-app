"use client";

import { Link2, Share2 } from "lucide-react";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";

/** Share a product: the phone's share sheet when there is one, else WhatsApp / Facebook / copy link. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent;
  const btn = "inline-flex size-9 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground";
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Share:</span>
      <button
        type="button"
        className={btn}
        aria-label="Share"
        onClick={async () => {
          if (navigator.share) {
            await navigator.share({ title, url }).catch(() => {});
          } else {
            await navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
          }
        }}
      >
        <Share2 className="size-4" />
      </button>
      <a className={btn} aria-label="Share on WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${enc(`${title} ${url}`)}`}>
        <FaWhatsapp className="size-4" />
      </a>
      <a className={btn} aria-label="Share on Facebook" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}>
        <FaFacebookF className="size-4" />
      </a>
      <button
        type="button"
        className={btn}
        aria-label="Copy link"
        onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))}
      >
        <Link2 className="size-4" />
      </button>
    </div>
  );
}
