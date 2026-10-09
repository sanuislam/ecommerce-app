import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATES, getSmsSettings, SMS_EVENT_LABEL, SMS_EVENTS, TEMPLATE_VARS } from "@/lib/sms";
import { SmsSettingsForm } from "@/components/admin/sms-settings-form";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function SmsPage() {
  const [s, recent] = await Promise.all([
    getSmsSettings(),
    prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">SMS</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Text customers through Alpha SMS (sms.net.bd) when their order is received, shipped, delivered or cancelled.
        Each message goes once per order.
      </p>
      <div className="mt-6">
        <SmsSettingsForm
          initial={{
            enabled: s.enabled,
            hasKey: !!s.apiKey,
            keyHint: s.apiKey ? `••••${s.apiKey.slice(-4)}` : "",
            senderId: s.senderId,
            on: s.on,
            templates: s.templates,
          }}
          events={SMS_EVENTS.map((e) => ({ id: e, label: SMS_EVENT_LABEL[e], fallback: DEFAULT_TEMPLATES[e] }))}
          vars={TEMPLATE_VARS}
        />
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">Recent messages</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border bg-card text-sm">
            {recent.map((l) => (
              <li key={l.id} className="grid gap-1 p-3 sm:grid-cols-[140px_1fr_auto] sm:gap-4">
                <span className="text-muted-foreground tabular-nums">{fmt(l.createdAt)}</span>
                <span className="min-w-0">
                  <span className="font-medium tabular-nums">{l.phone}</span>
                  {l.orderId && (
                    <a href={`/admin/orders/${l.orderId}`} className="ml-2 text-xs underline">
                      Order
                    </a>
                  )}
                  <span className="block truncate text-muted-foreground">{l.message}</span>
                  {l.error && <span className="block text-xs text-destructive">{l.error}</span>}
                </span>
                <span
                  className={
                    l.status === "sent"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : l.status === "failed"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }
                >
                  {l.status === "sent" ? "Sent" : l.status === "failed" ? "Failed" : "Sending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
