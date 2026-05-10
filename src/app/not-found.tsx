import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { PaymentsStrip } from "@/components/site/payments-strip";
import { TawkChat } from "@/components/site/tawk-chat";
import NotFoundContent from "@/components/site/not-found-content";

export const metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist on Eid Bazar.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <PaymentsStrip />
      <SiteFooter />
      <TawkChat />
    </div>
  );
}
