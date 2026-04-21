"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/generated/prisma";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<OrderStatus>(status);
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    const typed = next as OrderStatus;
    setValue(typed);
    setSaving(true);
    try {
      await axios.patch(`/api/admin/orders/${orderId}`, { status: typed });
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Could not update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={saving}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
