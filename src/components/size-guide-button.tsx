"use client";

import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** "Size guide" link that opens the category's size chart. */
export function SizeGuideButton({ rows, category }: { rows: string[][]; category: string }) {
  if (rows.length < 2) return null;
  const [head, ...body] = rows;
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1 text-sm underline underline-offset-2">
        <Ruler className="size-4" /> Size guide
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Size guide</DialogTitle>
          <DialogDescription>{category} — measurements may vary slightly.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                {head.map((c, i) => (
                  <th key={i} className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr key={i} className="border-t">
                  {r.map((c, j) => (
                    <td key={j} className={j === 0 ? "px-3 py-2 font-medium" : "px-3 py-2 tabular-nums"}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
