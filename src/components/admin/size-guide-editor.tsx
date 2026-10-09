"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { parseSizeGuide } from "@/lib/size-guide";

const EXAMPLE = `Size | Chest (in) | Length (in)
M | 40 | 42
L | 42 | 43
XL | 44 | 44`;

/** Size chart for a category, written as simple rows: cells split by "|". */
export function SizeGuideEditor({ id, name, initial }: { id: string; name: string; initial: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const rows = parseSizeGuide(text);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" title="Size guide">
          <Ruler className="size-4" /> {initial ? "Edit" : "Add"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Size guide — {name}</DialogTitle>
          <DialogDescription>
            Shown as a table on every product page in this category. One row per line, cells split by &quot;|&quot;; the first row is the
            header. Leave empty to hide it.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} className="font-mono text-sm" />
        {rows.length > 1 ? (
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-xs">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i === 0 ? "bg-muted font-medium" : "border-t"}>
                    {r.map((c, j) => (
                      <td key={j} className="px-2 py-1">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await fetch(`/api/admin/categories/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sizeGuide: text }),
              });
              setBusy(false);
              if (!res.ok) return toast.error("Could not save");
              toast.success("Size guide saved");
              setOpen(false);
              router.refresh();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
