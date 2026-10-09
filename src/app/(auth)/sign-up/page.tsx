import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import Link from "next/link";
import { SignUpForm } from "@/components/sign-up-form";
import { AuthMethods } from "@/components/auth-methods";
import { getSmsSettings } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Eid Bazar account.",
  alternates: { canonical: "/sign-up" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join Eid Bazar in a few seconds.
        </p>
        <AuthMethods mode="sign-up" callbackUrl="/" smsReady={smsReady} google={google} emailForm={<SignUpForm />} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
