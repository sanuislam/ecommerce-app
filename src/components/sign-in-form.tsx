"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm({ callbackUrl, defaultEmail = "" }: { callbackUrl: string; defaultEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Shown once the account turned out to have two-factor sign-in.
  const [needCode, setNeedCode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      ...(needCode ? { code } : {}),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      if (res.code === "2fa_required") {
        setNeedCode(true);
        return;
      }
      if (res.code === "2fa_invalid") {
        toast.error("That code didn't work. Use the newest code from your app, or a recovery code.");
        setCode("");
        return;
      }
      setNeedCode(false);
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Signed in");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div className={needCode ? "hidden" : undefined}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className={needCode ? "hidden" : undefined}>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {needCode ? (
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-emerald-600" /> Two-factor sign-in
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Type the 6-digit code from your authenticator app for {email}. Lost the phone? Use one of your recovery codes.
          </p>
          <Input
            id="code"
            className="mt-2 text-center font-mono text-lg tracking-widest"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={20}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="button"
            className="mt-2 text-xs text-muted-foreground underline"
            onClick={() => {
              setNeedCode(false);
              setCode("");
            }}
          >
            Use another account
          </button>
        </div>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : needCode ? "Verify and sign in" : "Sign in"}
      </Button>
    </form>
  );
}
