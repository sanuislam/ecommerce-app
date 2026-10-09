"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { cn } from "@/lib/utils";

/** Mobile (SMS code) / e-mail tabs, plus Google when it is set up. */
export function AuthMethods({
  callbackUrl,
  smsReady,
  google,
  emailForm,
  mode,
}: {
  callbackUrl: string;
  smsReady: boolean;
  google: boolean;
  emailForm: React.ReactNode;
  mode: "sign-in" | "sign-up";
}) {
  const [tab, setTab] = useState<"phone" | "email">(smsReady ? "phone" : "email");
  return (
    <div>
      {google ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-5 w-full gap-2"
            onClick={() => signIn("google", { callbackUrl })}
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
              <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
              <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
            </svg>
            Continue with Google
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
      {smsReady ? (
        <div role="tablist" className={cn("grid grid-cols-2 rounded-lg bg-muted p-1 text-sm", !google && "mt-5")}>
          {(["phone", "email"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded-md py-1.5 font-medium transition", tab === t ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              {t === "phone" ? "Mobile number" : "E-mail"}
            </button>
          ))}
        </div>
      ) : null}
      {tab === "phone" && smsReady ? <PhoneLoginForm callbackUrl={callbackUrl} askName={mode === "sign-up"} /> : emailForm}
    </div>
  );
}
