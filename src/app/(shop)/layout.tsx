import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { PaymentsStrip } from "@/components/site/payments-strip";
import { TawkChat } from "@/components/site/tawk-chat";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <PaymentsStrip />
      <SiteFooter />
      <TawkChat />
    </div>
  );
}
