import { prisma } from "@/lib/prisma";
import { getOrderSettings } from "@/lib/order-settings";
import { getSmsSettings } from "@/lib/sms";
import { OrderRulesForm, BlocklistManager } from "@/components/admin/order-rules";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" });

export default async function OrderRulesPage() {
  const [rules, sms, blocked] = await Promise.all([
    getOrderSettings(),
    getSmsSettings(),
    prisma.blockedPhone.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Order rules</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Protect cash on delivery from fake orders, and set how customers can return or exchange.
      </p>
      <div className="mt-6 grid max-w-3xl gap-6">
        <OrderRulesForm initial={rules} smsReady={sms.enabled && !!sms.apiKey} />
        <BlocklistManager
          rows={blocked.map((b) => ({ id: b.id, phone: b.phone, reason: b.reason, at: fmt(b.createdAt) }))}
        />
      </div>
    </div>
  );
}
