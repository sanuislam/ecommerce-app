import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { PaymentsStrip } from "@/components/site/payments-strip";
import { TawkChat } from "@/components/site/tawk-chat";
import { BottomNav, BottomNavSpacer } from "@/components/site/bottom-nav";
import { PwaInstallBanner } from "@/components/pwa-install-button";
import { prisma } from "@/lib/prisma";
import { CartSync } from "@/components/site/cart-sync";
import { getStoreFacts } from "@/lib/store-facts";

async function getNavCategories() {
  try {
    return await prisma.category.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
      take: 12,
    });
  } catch {
    return [];
  }
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [categories, facts] = await Promise.all([getNavCategories(), getStoreFacts()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <PaymentsStrip />
      <SiteFooter />
      <BottomNavSpacer />
      <BottomNav />
      <TawkChat tawkId={facts.tawkId} />
      <PwaInstallBanner />
      <CartSync />
    </div>
  );
}
