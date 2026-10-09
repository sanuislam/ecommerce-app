import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ResetPasswordForm } from "@/components/password-reset-forms";
import { resetTarget } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  const user = await resetTarget(token);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold tracking-tight">
        <LogoMark className="size-8" /> Eid Bazar
      </Link>
      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        {user ? (
          <ResetPasswordForm token={token} email={user.email} />
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              This link has expired or was already used. Links work once, for 60 minutes.
            </p>
            <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Ask for a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
