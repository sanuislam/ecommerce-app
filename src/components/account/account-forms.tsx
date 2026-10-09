"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BD_DISTRICTS } from "@/lib/districts";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function ProfileForm({
  initial,
  email,
}: {
  initial: { firstName: string; lastName: string; phone: string };
  email: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await send("/api/account", "PATCH", data);
      toast.success("Profile saved");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" required autoComplete="given-name" value={data.firstName} onChange={(e) => setData({ ...data, firstName: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" autoComplete="family-name" value={data.lastName} onChange={(e) => setData({ ...data, lastName: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="acc-phone">Mobile number</Label>
        <Input id="acc-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="acc-email">Email</Label>
        <Input id="acc-email" value={email} placeholder="Not added (signed in with mobile)" readOnly disabled />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await send("/api/account/password", "POST", { currentPassword, newPassword });
      toast.success("Password changed. Sign in again with the new one.");
      // Every session (this one too) ends after a password change.
      await signOut({ callbackUrl: "/sign-in" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="cur-pw">Current password</Label>
        <Input id="cur-pw" type="password" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="new-pw">New password</Label>
        <Input id="new-pw" type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="confirm-pw">Confirm new password</Label>
        <Input id="confirm-pw" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" variant="outline" disabled={saving}>{saving ? "Saving..." : "Change password"}</Button>
      </div>
    </form>
  );
}

export type BookAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  isDefault: boolean;
};

export function AddressBook({ addresses }: { addresses: BookAddress[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [busy, setBusy] = useState<string | null>(null);
  const empty = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", isDefault: false };
  const [form, setForm] = useState(empty);

  async function act(id: string, method: "PATCH" | "DELETE") {
    setBusy(id);
    try {
      await send(`/api/account/addresses/${id}`, method);
      toast.success(method === "PATCH" ? "Default address updated" : "Address removed");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.state) {
      toast.error("Please choose a district");
      return;
    }
    setBusy("new");
    try {
      await send("/api/account/addresses", "POST", form);
      toast.success("Address saved");
      setForm(empty);
      setAdding(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {addresses.map((a) => (
        <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 text-sm">
          <div className="flex min-w-0 gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="font-medium">
                {a.fullName} <span className="font-normal text-muted-foreground">· {a.phone}</span>
                {a.isDefault && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Default</span>}
              </div>
              <div className="break-words text-muted-foreground">
                {[a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ")}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {!a.isDefault && (
              <Button variant="ghost" size="sm" disabled={busy === a.id} onClick={() => act(a.id, "PATCH")}>
                <Star className="size-3.5" /> Make default
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={busy === a.id}
              onClick={() => act(a.id, "DELETE")}
              aria-label={`Remove address for ${a.fullName}`}
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          </div>
        </div>
      ))}

      {adding ? (
        <form onSubmit={add} className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="ab-name">Full name</Label>
            <Input id="ab-name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ab-phone">Mobile number</Label>
            <Input id="ab-phone" type="tel" inputMode="tel" required placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ab-district">District</Label>
            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
              <SelectTrigger id="ab-district" className="w-full">
                <SelectValue placeholder="Choose district" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {BD_DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ab-city">Area / Thana</Label>
            <Input id="ab-city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ab-postal">Postal code (optional)</Label>
            <Input id="ab-postal" inputMode="numeric" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ab-line1">Full address</Label>
            <Input id="ab-line1" required placeholder="House, road, block / village" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ab-line2">Landmark (optional)</Label>
            <Input id="ab-line2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v === true })} />
            Make this my default address
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy === "new"}>{busy === "new" ? "Saving..." : "Save address"}</Button>
            {addresses.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            )}
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add address
        </Button>
      )}
    </div>
  );
}
