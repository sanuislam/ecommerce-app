import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AccountShell } from "@/components/account/account-shell";
import { DeleteAccount, PasswordForm, SignOutEverywhere } from "@/components/account/account-forms";
import { hasRealEmail, OPEN_ORDER_STATUSES } from "@/lib/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Security", robots: { index: false, follow: false } };

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/account/security");
  const userId = session.user.id;
  const [user, openOrders, openReturns] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true, role: true, phone: true } }),
    prisma.order.count({ where: { userId, status: { in: [...OPEN_ORDER_STATUSES] } } }),
    prisma.returnRequest.count({ where: { order: { userId }, status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } }),
  ]);
  if (!user) redirect("/sign-in");
  const hasPassword = !!user.passwordHash;
  const blocked =
    user.role !== "USER"
      ? "Staff accounts are removed by the shop owner."
      : openOrders || openReturns
        ? "You have an order or a return still in progress. You can delete your account once it's finished."
        : null;

  return (
    <AccountShell title="Security">
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold">How you sign in</h2>
        <ul className="mb-4 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {user.phone && <li>With a code sent to {user.phone}</li>}
          {hasPassword && hasRealEmail(user.email) && <li>With {user.email} and your password</li>}
        </ul>
        <h3 className="mb-3 font-medium">{hasPassword ? "Change password" : "Set a password"}</h3>
        <PasswordForm hasPassword={hasPassword} canSet={hasRealEmail(user.email)} />
      </section>

      <section className="mt-6 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold">Devices</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Lost a phone or signed in on someone else&apos;s computer? Sign out everywhere, then sign in again here.
        </p>
        <SignOutEverywhere />
      </section>

      <section className="mt-6 rounded-lg border border-destructive/30 bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold">Delete account</h2>
        <p className="mb-4 text-sm text-muted-foreground">Permanently remove your account and personal details.</p>
        <DeleteAccount hasPassword={hasPassword} blocked={blocked} />
      </section>
    </AccountShell>
  );
}
