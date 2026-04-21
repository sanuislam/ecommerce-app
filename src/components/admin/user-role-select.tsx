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
import { Role } from "@/generated/prisma";

export function UserRoleSelect({
  userId,
  role,
  disabled = false,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(role);
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    const typed = next as Role;
    const previous = value;
    setValue(typed);
    setSaving(true);
    try {
      await axios.patch(`/api/admin/users/${userId}`, { role: typed });
      toast.success("Role updated");
      router.refresh();
    } catch (err) {
      setValue(previous);
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not update";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={saving || disabled}
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">USER</SelectItem>
        <SelectItem value="ADMIN">ADMIN</SelectItem>
      </SelectContent>
    </Select>
  );
}
