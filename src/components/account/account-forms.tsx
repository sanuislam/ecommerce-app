"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { LogOut, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
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

export function ProfileForm({ initial }: { initial: { firstName: string; lastName: string; phone: string } }) {
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
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
      </div>
    </form>
  );
}

/** Change the password — or, for an account made with a mobile code / Google, set a first one. */
export function PasswordForm({ hasPassword, canSet }: { hasPassword: boolean; canSet: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  if (!hasPassword && !canSet) {
    return (
      <p className="text-sm text-muted-foreground">
        You sign in with a code sent to your mobile. To also sign in with a password, first add and confirm your
        e-mail on the Profile page.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await send("/api/account/password", "POST", { currentPassword, newPassword });
      if (!hasPassword) {
        toast.success("Password set. You can now sign in with your e-mail and this password too.");
        setNew("");
        setConfirm("");
        router.refresh();
      } else {
        toast.success("Password changed. Sign in again with the new one.");
        // Every session (this one too) ends after a password change.
        await signOut({ callbackUrl: "/sign-in" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`grid gap-3 ${hasPassword ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {hasPassword && (
        <div>
          <Label htmlFor="cur-pw">Current password</Label>
          <Input id="cur-pw" type="password" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </div>
      )}
      <div>
        <Label htmlFor="new-pw">New password</Label>
        <Input id="new-pw" type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="confirm-pw">Confirm new password</Label>
        <Input id="confirm-pw" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <div className={hasPassword ? "sm:col-span-3" : "sm:col-span-2"}>
        <Button type="submit" variant="outline" disabled={saving}>
          {saving ? "Saving..." : hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}

/** Add or change the e-mail: a link goes to the new address and must be clicked. */
export function EmailForm({ current, mailOn }: { current: string; mailOn: boolean }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-muted-foreground">Current e-mail</div>
        <div className="font-medium">{current || "Not added yet"}</div>
      </div>
      {!mailOn ? (
        <p className="text-muted-foreground">Adding an e-mail isn&apos;t available right now.</p>
      ) : sentTo ? (
        <p className="rounded-md bg-muted/50 p-3">
          We sent a link to <span className="font-medium">{sentTo}</span>. Open it on this device (while signed in) within
          24 hours to confirm. Didn&apos;t get it? Check spam, or{" "}
          <button type="button" className="font-medium underline" onClick={() => setSentTo("")}>
            try again
          </button>
          .
        </p>
      ) : (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await send("/api/account/email", "POST", { email });
              setSentTo(email.trim());
              setEmail("");
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label htmlFor="new-email" className="sr-only">
            New e-mail
          </Label>
          <Input
            id="new-email"
            type="email"
            required
            autoComplete="email"
            placeholder={current ? "New e-mail" : "you@example.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button type="submit" variant="outline" disabled={busy}>
            {busy ? "Sending..." : current ? "Change e-mail" : "Add e-mail"}
          </Button>
        </form>
      )}
    </div>
  );
}

/** Ends every session of the account, on all devices. */
export function SignOutEverywhere() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Sign out on every phone and computer, including this one?")) return;
        setBusy(true);
        try {
          await send("/api/account/sessions", "DELETE");
          await signOut({ callbackUrl: "/sign-in" });
        } catch (err) {
          toast.error((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <LogOut className="size-4" /> Sign out everywhere
    </Button>
  );
}

/** Deletes the account after the customer types DELETE (and the password, if they have one). */
export function DeleteAccount({ hasPassword, blocked }: { hasPassword: boolean; blocked: string | null }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  if (blocked) return <p className="text-sm text-muted-foreground">{blocked}</p>;
  if (!open) {
    return (
      <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" /> Delete my account
      </Button>
    );
  }
  return (
    <form
      className="space-y-3 rounded-lg border border-destructive/40 p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send("/api/account/delete", "POST", { confirm: confirmText.trim(), password });
          toast.success("Your account was deleted.");
          await signOut({ callbackUrl: "/" });
        } catch (err) {
          toast.error((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <p>
        This removes your name, phone, e-mail, addresses, wishlist and saved cart, and you won&apos;t be able to sign in
        to this account again. Past orders stay in the shop&apos;s records. This can&apos;t be undone.
      </p>
      {hasPassword && (
        <div>
          <Label htmlFor="del-pw">Your password</Label>
          <Input id="del-pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="sm:max-w-xs" />
        </div>
      )}
      <div>
        <Label htmlFor="del-confirm">
          Type <span className="font-mono font-semibold">DELETE</span> to confirm
        </Label>
        <Input id="del-confirm" required autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="sm:max-w-xs" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={busy || confirmText.trim() !== "DELETE"}>
          {busy ? "Deleting..." : "Delete account"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
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
  postalCode: string;
  isDefault: boolean;
};

type AddressFields = Omit<BookAddress, "id">;
const EMPTY_ADDRESS: AddressFields = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", isDefault: false };

function AddressEditor({
  initial,
  busy,
  onSave,
  onCancel,
  idPrefix,
  showDefault,
}: {
  initial: AddressFields;
  busy: boolean;
  onSave: (a: AddressFields) => void;
  onCancel?: () => void;
  idPrefix: string;
  showDefault: boolean;
}) {
  const [form, setForm] = useState(initial);
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.state) {
          toast.error("Please choose a district");
          return;
        }
        onSave(form);
      }}
      className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <Label htmlFor={id("name")}>Full name</Label>
        <Input id={id("name")} required autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      </div>
      <div>
        <Label htmlFor={id("phone")}>Mobile number</Label>
        <Input id={id("phone")} type="tel" inputMode="tel" required placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <Label htmlFor={id("district")}>District</Label>
        <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
          <SelectTrigger id={id("district")} className="w-full">
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
        <Label htmlFor={id("city")}>Area / Thana</Label>
        <Input id={id("city")} required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <Label htmlFor={id("postal")}>Postal code (optional)</Label>
        <Input id={id("postal")} inputMode="numeric" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={id("line1")}>Full address</Label>
        <Input id={id("line1")} required placeholder="House, road, block / village" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={id("line2")}>Landmark (optional)</Label>
        <Input id={id("line2")} value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
      </div>
      {showDefault && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Checkbox checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v === true })} />
          Make this my default address
        </label>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save address"}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}

export function AddressBook({ addresses }: { addresses: BookAddress[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, method: "PATCH" | "DELETE") {
    if (method === "DELETE" && !confirm("Remove this address?")) return;
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

  async function save(id: string | null, a: AddressFields) {
    setBusy(id ?? "new");
    try {
      if (id) await send(`/api/account/addresses/${id}`, "PATCH", a);
      else await send("/api/account/addresses", "POST", a);
      toast.success("Address saved");
      setAdding(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {addresses.map((a) =>
        editing === a.id ? (
          <AddressEditor
            key={a.id}
            idPrefix={`ed-${a.id}`}
            initial={a}
            busy={busy === a.id}
            showDefault={!a.isDefault}
            onSave={(f) => save(a.id, f)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-3 text-sm">
            <div className="flex min-w-0 gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium">
                  {a.fullName} <span className="font-normal text-muted-foreground">· {a.phone}</span>
                  {a.isDefault && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Default</span>}
                </div>
                <div className="break-words text-muted-foreground">
                  {[a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => setEditing(a.id)} aria-label={`Edit address for ${a.fullName}`}>
                <Pencil className="size-3.5" /> Edit
              </Button>
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
        ),
      )}

      {adding ? (
        <AddressEditor
          idPrefix="ab"
          initial={EMPTY_ADDRESS}
          busy={busy === "new"}
          showDefault
          onSave={(f) => save(null, f)}
          onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : addresses.length < 10 ? (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add address
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You can save up to 10 addresses.</p>
      )}
    </div>
  );
}
