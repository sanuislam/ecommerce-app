"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessageHandledButton({ id, handled }: { id: string; handled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant={handled ? "ghost" : "outline"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/admin/messages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handled: !handled }),
        });
        setBusy(false);
        if (!res.ok) toast.error("Could not save");
        router.refresh();
      }}
    >
      {handled ? <RotateCcw className="size-4" /> : <Check className="size-4" />} {handled ? "Open again" : "Mark handled"}
    </Button>
  );
}
