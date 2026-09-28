"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/store/wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  className,
  withLabel = false,
}: {
  productId: string;
  className?: string;
  withLabel?: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const active = useWishlist((s) => s.ids.has(productId));
  const load = useWishlist((s) => s.load);
  const toggle = useWishlist((s) => s.toggle);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    try {
      const now = await toggle(productId);
      toast.success(now ? "Saved to wishlist" : "Removed from wishlist");
    } catch {
      toast.error("Could not update wishlist");
    }
  }

  const label = active ? "Remove from wishlist" : "Save to wishlist";
  return (
    <Button
      type="button"
      variant={withLabel ? "outline" : "ghost"}
      size={withLabel ? "lg" : "icon"}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn("rounded-full", withLabel && "rounded-lg", className)}
    >
      <Heart className={cn("size-4", active && "fill-rose-500 text-rose-500")} />
      {withLabel && <span>{active ? "Saved" : "Wishlist"}</span>}
    </Button>
  );
}
