"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ title, count }: { title: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="text-sm">
        <span className="font-semibold">{title}</span>{" "}
        <span className="text-muted-foreground">· {count} order{count === 1 ? "" : "s"}</span>
      </div>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> Print
      </Button>
    </div>
  );
}
