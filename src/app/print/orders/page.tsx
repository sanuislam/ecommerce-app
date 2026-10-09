import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getSeoSettings } from "@/lib/seo-settings";
import { OrderSheets } from "@/components/print/order-sheets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Print orders", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ ids?: string; type?: string }> };

export default async function PrintOrdersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/orders");
  if (!can(session.user.role, session.user.staffRole, "orders")) notFound();

  const sp = await searchParams;
  const type = sp.type === "slip" ? "slip" : "invoice";
  const ids = (sp.ids ?? "").split(",").filter(Boolean).slice(0, 200);
  if (!ids.length) notFound();

  const [orders, site, seo] = await Promise.all([
    prisma.order.findMany({
      where: { id: { in: ids } },
      include: { items: true, address: true, user: { select: { name: true, email: true, phone: true } } },
    }),
    getSiteSettings(),
    getSeoSettings(),
  ]);
  // Keep the order the admin selected them in.
  orders.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  const shop = seo.siteName || "Eid Bazar";

  return <OrderSheets orders={orders} type={type} shop={shop} site={site} />;
}
