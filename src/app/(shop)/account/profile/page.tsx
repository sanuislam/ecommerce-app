import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AccountShell } from "@/components/account/account-shell";
import { EmailForm, ProfileForm } from "@/components/account/account-forms";
import { SmsOffersToggle } from "@/components/account/sms-offers-toggle";
import { hasRealEmail } from "@/lib/account";
import { mailReady } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };

const EMAIL_NOTICE: Record<string, { ok: boolean; text: string }> = {
  verified: { ok: true, text: "Your e-mail is confirmed and saved." },
  invalid: { ok: false, text: "That link has expired or was already used. Ask for a new one below." },
  taken: { ok: false, text: "Another account already uses that e-mail." },
};

type Props = { searchParams: Promise<{ email?: string }> };

export default async function ProfilePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/account/profile");
  const { email: notice } = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, firstName: true, lastName: true, phone: true, email: true, role: true, smsOptOut: true },
  });
  if (!user) redirect("/sign-in");
  const [fallbackFirst, ...rest] = (user.name ?? "").split(" ");
  const n = notice ? EMAIL_NOTICE[notice] : undefined;

  return (
    <AccountShell title="Profile">
      {n && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${n.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-400/40 bg-amber-500/10"}`}
        >
          {n.ok ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" /> : <AlertCircle className="mt-0.5 size-4 text-amber-600" />}
          {n.text}
        </div>
      )}
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold">Your details</h2>
        <ProfileForm
          initial={{
            firstName: user.firstName ?? fallbackFirst ?? "",
            lastName: user.lastName ?? rest.join(" "),
            phone: user.phone?.startsWith("01") ? user.phone : "",
          }}
        />
      </section>

      <section className="mt-6 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold">E-mail</h2>
        <p className="mb-4 text-sm text-muted-foreground">For receipts and to sign in with a password.</p>
        {user.role === "USER" ? (
          <EmailForm current={hasRealEmail(user.email) ? user.email : ""} mailOn={mailReady()} />
        ) : (
          <p className="text-sm">
            {user.email} <span className="text-muted-foreground">· staff e-mails are changed in the admin panel</span>
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold">Messages</h2>
        <SmsOffersToggle initial={!user.smsOptOut} />
      </section>
    </AccountShell>
  );
}
