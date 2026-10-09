"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Mobile number → 6-digit SMS code. The same two steps sign in an existing
 * customer or create a new account, so there is no separate sign-up form.
 */
export function PhoneLoginForm({ callbackUrl, askName = false }: { callbackUrl: string; askName?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode() {
    setBusy(true);
    try {
      const res = await fetch("/api/login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send the code");
      setStep("code");
      setWait(60);
      setCode("");
      toast.success("Code sent by SMS");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await signIn("phone-otp", { phone, code, name, redirect: false });
    setBusy(false);
    if (res?.error) {
      toast.error(
        res.code === "staff_use_password"
          ? "Shop staff sign in with e-mail and password."
          : "That code didn't work. Check the SMS or ask for a new code.",
      );
      return;
    }
    toast.success("Signed in");
    router.push(callbackUrl);
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
        className="mt-5 space-y-3"
      >
        {askName ? (
          <div>
            <Label htmlFor="p-name">Your name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
          </div>
        ) : null}
        <div>
          <Label htmlFor="p-phone">Mobile number</Label>
          <Input
            id="p-phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy || phone.replace(/\D/g, "").length < 10}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />} Send code
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We&apos;ll text you a 6-digit code. New here? The same code creates your account.
        </p>
      </form>
    );
  }
  return (
    <form onSubmit={verify} className="mt-5 space-y-3">
      <p className="text-sm text-muted-foreground">
        Enter the code sent to <span className="font-medium text-foreground">{phone}</span>
      </p>
      <Input
        id="p-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        maxLength={6}
        placeholder="123456"
        className="h-12 text-center font-mono text-xl tracking-[0.5em]"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        aria-label="6-digit code"
      />
      <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Verify and continue
      </Button>
      <div className="flex justify-between text-xs">
        <button type="button" className="text-muted-foreground underline" onClick={() => setStep("phone")}>
          Change number
        </button>
        <button type="button" className="underline disabled:no-underline disabled:opacity-50" disabled={wait > 0 || busy} onClick={sendCode}>
          {wait > 0 ? `Send again in ${wait}s` : "Send a new code"}
        </button>
      </div>
    </form>
  );
}
