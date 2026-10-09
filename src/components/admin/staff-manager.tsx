"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Link2, Loader2, ShieldCheck, ShieldOff, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Person = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "STAFF";
  staffRole: string | null;
  hasPassword: boolean;
  twoFactor: boolean;
  createdAt: string;
  lastActive: string | null;
};
type RoleInfo = { id: string; label: string; description: string; perms: string[] };

async function call<T = { ok: true }>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

function LinkBox({ link, note, onClose }: { link: string; note: string; onClose: () => void }) {
  return (
    <div className="mt-3 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/30">
      <p className="font-medium">{note}</p>
      <div className="mt-2 flex gap-2">
        <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Copied"))}>
          <Copy className="size-4" />
        </Button>
      </div>
      <button type="button" className="mt-2 text-xs text-muted-foreground underline" onClick={onClose}>
        Done
      </button>
    </div>
  );
}

export function StaffManager({
  meId,
  meHas2fa,
  require2fa,
  people,
  roles,
}: {
  meId: string;
  meHas2fa: boolean;
  require2fa: boolean;
  people: Person[];
  roles: RoleInfo[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(roles[0]?.id ?? "orders");
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<{ link: string; note: string } | null>(null);
  const roleLabel = (id: string | null) => roles.find((r) => r.id === id)?.label ?? id ?? "—";

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const add = () =>
    run("add", async () => {
      const r = await call<{ link: string | null; emailed: boolean }>("/api/admin/staff", "POST", { email, name, staffRole: role });
      if (r.link) {
        setLink({
          link: r.link,
          note: r.emailed
            ? `We e-mailed ${email} this link to set a password (7 days, once). You can also send it yourself:`
            : `Send ${email} this link to set a password (7 days, once), e.g. on WhatsApp:`,
        });
      } else {
        toast.success(`${email} can now sign in with their existing password`);
      }
      setEmail("");
      setName("");
      router.refresh();
    });

  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserPlus className="size-5" /> Add a staff member
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_200px_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="st-email">E-mail</Label>
            <Input id="st-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahim@example.com" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-name">Name (optional)</Label>
            <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={!!busy || !email.includes("@")} onClick={add}>
            {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Add
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          An e-mail that already has a customer account is promoted and keeps its password. A new e-mail gets a
          link to set one.
        </p>
        {link ? <LinkBox link={link.link} note={link.note} onClose={() => setLink(null)} /> : null}
      </section>

      <section className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Person</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Two-factor</th>
              <th className="p-3 font-medium">Last change</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const self = p.id === meId;
              return (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">
                      {p.name || p.email}
                      {self ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                    </div>
                    {p.name ? <div className="text-xs text-muted-foreground">{p.email}</div> : null}
                    {!p.hasPassword ? <div className="text-xs text-amber-700 dark:text-amber-400">Hasn&apos;t set a password yet</div> : null}
                  </td>
                  <td className="p-3">
                    {p.role === "ADMIN" ? (
                      <Badge>Owner</Badge>
                    ) : (
                      <Select
                        value={p.staffRole ?? undefined}
                        disabled={!!busy}
                        onValueChange={(v) =>
                          run(`role:${p.id}`, async () => {
                            await call(`/api/admin/staff/${p.id}`, "PATCH", { staffRole: v });
                            toast.success(`${p.email} is now ${roleLabel(v)}`);
                            router.refresh();
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Choose" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="p-3">
                    {p.twoFactor ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="size-4" /> On
                      </span>
                    ) : (
                      <span className={require2fa ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                        Off{require2fa ? " · locked out until on" : ""}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {p.lastActive ? new Date(p.lastActive).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="p-3">
                    {self ? null : (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Password link"
                          disabled={!!busy}
                          onClick={() =>
                            run(`link:${p.id}`, async () => {
                              const r = await call<{ link: string }>(`/api/admin/users/${p.id}/reset-link`, "POST");
                              setLink({ link: r.link, note: `Send ${p.email} this link to set a new password (24 hours, once):` });
                            })
                          }
                        >
                          <Link2 className="size-4" />
                        </Button>
                        {p.twoFactor ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Reset two-factor (lost phone)"
                            disabled={!!busy}
                            onClick={() =>
                              run(`2fa:${p.id}`, async () => {
                                if (!confirm(`Turn off two-factor for ${p.email}? They set it up again at their next sign-in.`)) return;
                                await call(`/api/admin/staff/${p.id}/reset-2fa`, "POST");
                                toast.success("Two-factor reset");
                                router.refresh();
                              })
                            }
                          >
                            <ShieldOff className="size-4" />
                          </Button>
                        ) : null}
                        {p.role === "STAFF" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" title="Remove from staff" disabled={!!busy}>
                                <UserMinus className="size-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {p.email}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  They lose the admin panel within a minute. The account stays as a customer
                                  account, and their past changes stay in the audit log.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    run(`rm:${p.id}`, async () => {
                                      await call(`/api/admin/staff/${p.id}`, "DELETE");
                                      toast.success("Removed from staff");
                                      router.refresh();
                                    })
                                  }
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">What each role can do</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="font-medium">{r.label}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
              <ul className="mt-2 space-y-0.5 text-xs">
                {r.perms.map((p) => (
                  <li key={p} className="flex gap-1.5">
                    <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Only owners change settings, payments, couriers, SMS, staff and see the audit log. Make someone an owner
          from <span className="font-medium">Users</span>.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound className="size-5" /> Require two-factor sign-in
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everyone with admin access must turn on an authenticator app before they can use the admin panel.
              {!meHas2fa ? " Turn it on for your own account first, in My security." : ""}
            </p>
          </div>
          <Switch
            checked={require2fa}
            disabled={!!busy || (!require2fa && !meHas2fa)}
            aria-label="Require two-factor sign-in"
            onCheckedChange={(v) =>
              run("req", async () => {
                await call("/api/admin/staff/settings", "PUT", { require2fa: v });
                toast.success(v ? "Two-factor is now required" : "Two-factor is optional");
                router.refresh();
              })
            }
          />
        </div>
      </section>
    </div>
  );
}
