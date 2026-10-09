"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Owner: makes a one-time password link for a locked-out user and copies it. */
export function UserResetLink({ userId, email }: { userId: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-link`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!res.ok || !data.link) throw new Error(data.error ?? "Could not make a link");
      setLink(data.link);
      await navigator.clipboard.writeText(data.link).catch(() => {});
      toast.success(`Link for ${email} copied. It works once, for 24 hours.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not make a link");
    } finally {
      setBusy(false);
    }
  }

  if (link) {
    return (
      <input
        readOnly
        value={link}
        className="w-48 rounded border bg-muted px-2 py-1 font-mono text-[11px]"
        onFocus={(e) => e.currentTarget.select()}
      />
    );
  }
  return (
    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={make} title="Make a password reset link">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
      <span className="sr-only sm:not-sr-only">Reset link</span>
    </Button>
  );
}
