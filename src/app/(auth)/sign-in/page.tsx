import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
import { AuthMethods } from "@/components/auth-methods";
import { getSmsSettings } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Eid Bazar account.",
  alternates: { canonical: "/sign-in" },
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string; email?: string }>;
};

function safeCallbackUrl(url: string | undefined): string {
  if (!url) return "/";
  // Only allow same-origin relative paths; reject protocol-relative (//evil.com)
  // and absolute URLs.
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }
  return "/";
}

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl, email, error } = await searchParams;
  const safeUrl = safeCallbackUrl(callbackUrl);
  const sms = await getSmsSettings();
  const smsReady = sms.enabled && !!sms.apiKey;
  const google = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold tracking-tight"
      >
        <LogoMark className="size-8" /> Eid Bazar
      </Link>
      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue shopping.
        </p>
        {error === "staff_use_password" ? (
          <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Shop staff sign in with e-mail and password.
          </p>
        ) : null}
        <AuthMethods
          mode="sign-in"
          callbackUrl={safeUrl}
          smsReady={smsReady}
          google={google}
          emailForm={
            <>
              <SignInForm callbackUrl={safeUrl} defaultEmail={typeof email === "string" ? email.slice(0, 200) : ""} />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Link href="/forgot-password" className="underline hover:text-foreground">
                  Forgot your password?
                </Link>
              </p>
            </>
          }
        />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
