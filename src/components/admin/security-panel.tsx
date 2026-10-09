"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = codes.join("\n");
  return (
    <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <p className="text-sm font-medium">Save these recovery codes now</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Each one signs you in once if you lose your phone. They won&apos;t be shown again.
      </p>
      <pre className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-background p-3 font-mono text-sm">
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied"))}
        >
          <Copy className="size-4" /> Copy
        </Button>
        <Button type="button" size="sm" onClick={onDone}>
          I saved them
        </Button>
      </div>
    </div>
  );
}

export function SecurityPanel({ enabledAt, recoveryLeft }: { enabledAt: string | null; recoveryLeft: number }) {
  const router = useRouter();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  // Turning on
  const [setupPw, setSetupPw] = useState("");
  const [setup, setSetup] = useState<{ secret: string; qr: string; pending: string } | null>(null);
  const [firstCode, setFirstCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  // Turning off / new codes
  const [offPw, setOffPw] = useState("");
  const [offCode, setOffCode] = useState("");
  // Password
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const startSetup = () =>
    run(async () => {
      const r = await post<{ secret: string; qr: string; pending: string }>("/api/admin/security/2fa/setup", {
        password: setupPw,
      });
      setSetup(r);
      setSetupPw("");
    });

  const confirmSetup = () =>
    run(async () => {
      if (!setup) return;
      const r = await post<{ recoveryCodes: string[] }>("/api/admin/security/2fa/enable", {
        pending: setup.pending,
        code: firstCode,
      });
      setSetup(null);
      setFirstCode("");
      setCodes(r.recoveryCodes);
      // Re-read the sign-in from the database so the panel opens at once.
      await update();
      toast.success("Two-factor sign-in is on");
    });

  const turnOff = () =>
    run(async () => {
      await post("/api/admin/security/2fa/disable", { password: offPw, code: offCode });
      setOffPw("");
      setOffCode("");
      await update();
      toast.success("Two-factor sign-in is off");
      router.refresh();
    });

  const newCodes = () =>
    run(async () => {
      const r = await post<{ recoveryCodes: string[] }>("/api/admin/security/2fa/recovery", {
        password: offPw,
        code: offCode,
      });
      setOffPw("");
      setOffCode("");
      setCodes(r.recoveryCodes);
    });

  const changePassword = () =>
    run(async () => {
      if (next !== again) throw new Error("The two new passwords don't match");
      await post("/api/admin/security/password", { current: cur, next });
      toast.success("Password changed. Sign in again with the new one.");
      await signOut({ callbackUrl: "/sign-in" });
    });

  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-5" /> Two-factor sign-in
          </h2>
          {enabledAt ? (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">On since {new Date(enabledAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" })}</Badge>
          ) : (
            <Badge variant="outline">Off</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          After your password, sign-in asks for a 6-digit code from an app on your phone. A stolen password alone
          is then not enough to get into the admin panel.
        </p>

        {codes ? (
          <RecoveryCodes
            codes={codes}
            onDone={() => {
              setCodes(null);
              router.refresh();
            }}
          />
        ) : enabledAt ? (
          <div className="mt-4 grid gap-3 rounded-lg border p-3">
            <p className="text-sm">
              Recovery codes left: <span className="font-medium">{recoveryLeft}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="off-pw">Password</Label>
                <Input id="off-pw" type="password" autoComplete="current-password" value={offPw} onChange={(e) => setOffPw(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="off-code">Code from the app (or a recovery code)</Label>
                <Input id="off-code" autoComplete="one-time-code" value={offCode} onChange={(e) => setOffCode(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy || !offPw || !offCode} onClick={newCodes}>
                <KeyRound className="size-4" /> New recovery codes
              </Button>
              <Button type="button" variant="destructive" disabled={busy || !offPw || !offCode} onClick={turnOff}>
                <ShieldOff className="size-4" /> Turn off
              </Button>
            </div>
          </div>
        ) : setup ? (
          <div className="mt-4 grid gap-4 rounded-lg border p-3 sm:grid-cols-[220px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
            <img src={setup.qr} alt="QR code for your authenticator app" width={220} height={220} className="rounded-md border bg-white" />
            <div className="grid content-start gap-3 text-sm">
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open Google Authenticator, Microsoft Authenticator or another TOTP app.</li>
                <li>Add an account and scan this QR code.</li>
                <li>Type the 6-digit code it shows.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Can&apos;t scan? Enter this key by hand:{" "}
                <code className="break-all rounded bg-muted px-1 py-0.5 font-mono">{setup.secret}</code>
              </p>
              <div className="flex gap-2">
                <Input
                  className="max-w-40 text-center font-mono tracking-widest"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={firstCode}
                  onChange={(e) => setFirstCode(e.target.value.replace(/\D/g, ""))}
                />
                <Button type="button" disabled={busy || firstCode.length !== 6} onClick={confirmSetup}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null} Turn on
                </Button>
              </div>
              <button type="button" className="justify-self-start text-xs text-muted-foreground underline" onClick={() => setSetup(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="setup-pw">Your password</Label>
              <Input id="setup-pw" type="password" autoComplete="current-password" value={setupPw} onChange={(e) => setSetupPw(e.target.value)} />
            </div>
            <Button type="button" disabled={busy || !setupPw} onClick={startSetup}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Set up
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Changing it signs you out on every device, this one too.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cur">Current password</Label>
            <Input id="cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="next">New password</Label>
            <Input id="next" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="again">New password again</Label>
            <Input id="again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          </div>
        </div>
        <Button type="button" className="mt-3" disabled={busy || !cur || next.length < 8} onClick={changePassword}>
          Change password
        </Button>
      </section>
    </div>
  );
}
