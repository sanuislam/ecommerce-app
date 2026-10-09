import Image from "next/image";
import { Banknote } from "lucide-react";
import type { PayMethod } from "@/lib/store-facts";
import { cn } from "@/lib/utils";

/** Logos of the payment methods that really work at checkout. */
export function PaymentLogos({ methods, className, size = "md" }: { methods: PayMethod[]; className?: string; size?: "sm" | "md" }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {methods.map((m) => (
        <li
          key={m.id}
          title={m.name}
          className={cn(
            "flex items-center justify-center rounded-lg border bg-white px-3 shadow-sm dark:bg-white",
            size === "sm" ? "h-9 min-w-16" : "h-12 min-w-24",
          )}
        >
          {m.logo ? (
            <Image src={m.logo} alt={m.name} width={96} height={32} className={size === "sm" ? "h-5 w-auto" : "h-7 w-auto"} />
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Banknote className="size-4" /> Cash on delivery
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
