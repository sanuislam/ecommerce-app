import { Clock, Lock, RotateCcw, Truck } from "lucide-react";
import type { StoreFacts } from "@/lib/store-facts";
import { formatPrice } from "@/lib/utils";

/** Promises the shop actually keeps, built from its settings. */
export function TrustStrip({ facts }: { facts: StoreFacts }) {
  const badges = [
    { icon: Lock, label: "Secure checkout (SSL)" },
    ...(facts.freeThreshold > 0 ? [{ icon: Truck, label: `Free delivery from ${formatPrice(facts.freeThreshold)}` }] : []),
    ...(facts.returnsEnabled ? [{ icon: RotateCcw, label: `${facts.returnDays}-day returns` }] : []),
    ...(facts.supportHours ? [{ icon: Clock, label: `Support: ${facts.supportHours}` }] : []),
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ul className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-4 sm:p-5 lg:grid-cols-4">
        {badges.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-sm">
            <Icon className="size-4 shrink-0 text-primary" />
            <span className="font-medium">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
