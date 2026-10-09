import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getSeoSettings } from "@/lib/seo-settings";
import { OrderSheets } from "@/components/print/order-sheets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

/** A customer's printable invoice for one of their own orders. */
export default async function CustomerInvoicePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/invoice/${id}`)}`);
  const [order, site, seo] = await Promise.all([
    prisma.order.findFirst({
      where: { id, userId: session.user.id },
      include: { items: true, address: true, user: { select: { name: true, email: true, phone: true } } },
    }),
    getSiteSettings(),
    getSeoSettings(),
  ]);
  if (!order) notFound();
  return <OrderSheets orders={[order]} type="invoice" shop={seo.siteName || "Eid Bazar"} site={site} />;
}
