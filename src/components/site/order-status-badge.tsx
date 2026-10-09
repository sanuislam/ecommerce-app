import { Badge } from "@/components/ui/badge";
import { customerStatus, type CustomerOrderState } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const TONE = {
  good: "bg-emerald-600 text-white hover:bg-emerald-600",
  info: "bg-sky-100 text-sky-900 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-100",
  wait: "bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-100",
  bad: "bg-red-100 text-red-900 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-100",
};

export function OrderStatusBadge({ order }: { order: CustomerOrderState }) {
  const s = customerStatus(order);
  return <Badge className={cn("border-transparent", TONE[s.tone])}>{s.label}</Badge>;
}
