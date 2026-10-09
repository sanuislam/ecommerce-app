"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteReviewButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this review?")) return;
        setBusy(true);
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}/reviews`, { method: "DELETE" });
        setBusy(false);
        if (!res.ok) return toast.error("Could not delete the review");
        toast.success("Review deleted");
        router.refresh();
      }}
    >
      <Trash2 className="size-3.5" /> Delete
    </Button>
  );
}
