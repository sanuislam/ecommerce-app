import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AccountShell } from "@/components/account/account-shell";
import { AddressBook } from "@/components/account/account-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Addresses", robots: { index: false, follow: false } };

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/account/addresses");
  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id, archived: false },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return (
    <AccountShell title="Addresses" description="Saved addresses fill in checkout for you.">
      <AddressBook
        addresses={addresses.map((a) => ({
          id: a.id,
          fullName: a.fullName,
          phone: a.phone ?? "",
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city,
          state: a.state ?? "",
          postalCode: a.postalCode ?? "",
          isDefault: a.isDefault,
        }))}
      />
    </AccountShell>
  );
}
