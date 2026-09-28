"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ReviewForm({
  slug,
  initial,
}: {
  slug: string;
  initial?: { rating: number; title: string; comment: string };
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Please choose a star rating");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save review");
      toast.success(initial ? "Review updated" : "Thanks for your review!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">{initial ? "Update your review" : "Write a review"}</h3>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => setRating(i)}
            className="rounded p-1 text-amber-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Star className={cn("size-7", i <= rating ? "fill-current" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="review-title">Title (optional)</Label>
        <Input id="review-title" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="review-comment">Your review</Label>
        <Textarea
          id="review-comment"
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : initial ? "Update review" : "Submit review"}
      </Button>
    </form>
  );
}
