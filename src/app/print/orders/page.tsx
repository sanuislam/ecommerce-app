import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { getSeoSettings } from "@/lib/seo-settings";
import { STATUS_LABEL } from "@/lib/orders";
import { COURIER_LABEL, type CourierId } from "@/lib/couriers/common";
import { LogoMark } from "@/components/brand/logo";
import { PrintToolbar } from "@/components/admin/print-toolbar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Print orders", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ ids?: string; type?: string }> };

const METHOD: Record<string, string> = {
  COD: "Cash on delivery",
  BKASH: "bKash",
  UPAY: "Upay",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  STRIPE: "Card",
};

const dhakaDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" });

const money = (n: number) => formatPrice(n);

/** Printable invoices (A4, one per page) or packing slips (two per A4 page). */
export default async function PrintOrdersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/orders");
  if (session.user.role !== Role.ADMIN) notFound();

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

  return (
    <div className="min-h-dvh bg-neutral-100 text-neutral-900 print:bg-white">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print { .sheet { box-shadow: none !important; margin: 0 !important; } }
      `}</style>
      <PrintToolbar title={type === "slip" ? "Packing slips" : "Invoices"} count={orders.length} />
      <div className="mx-auto max-w-[210mm] py-6 print:py-0">
        {orders.map((o, i) => {
          const name = o.address?.fullName || o.user.name || "Customer";
          const phone = o.address?.phone || o.user.phone || "";
          const addressLines = [
            o.address?.line1,
            o.address?.line2,
            [o.address?.city, o.address?.state, o.address?.postalCode].filter(Boolean).join(", "),
          ].filter(Boolean) as string[];
          const paidOnline = o.paymentMethod !== "COD" && (!!o.paymentTransactionId || o.status !== "PENDING");
          const due = o.paymentMethod === "COD" && !o.paymentTransactionId && o.status !== "PAID" ? Number(o.total) : 0;
          const qty = o.items.reduce((n, it) => n + it.quantity, 0);
          const last = i === orders.length - 1;

          if (type === "slip") {
            return (
              <section
                key={o.id}
                className="sheet mx-auto mb-4 flex h-[136mm] flex-col overflow-hidden rounded-sm border border-neutral-300 bg-white p-6 shadow-sm print:mb-0 print:rounded-none print:border-dashed"
                style={{ breakInside: "avoid", breakAfter: i % 2 === 1 && !last ? "page" : "auto" }}
              >
                <header className="flex items-start justify-between gap-4 border-b border-neutral-300 pb-3">
                  <div className="flex items-center gap-2">
                    <LogoMark className="size-7" />
                    <div className="leading-tight">
                      <div className="font-semibold">{shop}</div>
                      <div className="text-xs text-neutral-500">{site.supportPhone}</div>
                    </div>
                  </div>
                  <div className="text-right leading-tight">
                    <div className="text-lg font-bold tracking-wide">#{o.id.slice(0, 8)}</div>
                    <div className="text-xs text-neutral-500">{dhakaDate(o.createdAt)}</div>
                  </div>
                </header>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-neutral-500">Deliver to</div>
                    <div className="text-lg font-semibold">{name}</div>
                    <div className="text-base font-medium tabular-nums">{phone}</div>
                    {addressLines.map((l) => (
                      <div key={l} className="text-sm">
                        {l}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md border-2 border-neutral-900 px-4 py-2 text-center">
                    <div className="text-xs font-medium">{due > 0 ? "Collect (COD)" : "Paid"}</div>
                    <div className="text-xl font-bold tabular-nums">{due > 0 ? money(due) : money(0)}</div>
                  </div>
                </div>
                {o.courier && (
                  <div className="mt-2 text-sm">
                    <span className="text-neutral-500">Courier:</span>{" "}
                    <span className="font-medium">{COURIER_LABEL[o.courier as CourierId] ?? o.courier}</span>
                    {o.trackingNumber && <span className="font-mono"> · {o.trackingNumber}</span>}
                  </div>
                )}
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-y border-neutral-300 text-left text-xs text-neutral-500">
                      <th className="w-6 py-1" />
                      <th className="py-1">Item</th>
                      <th className="py-1 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.slice(0, 8).map((it) => (
                      <tr key={it.id} className="border-b border-neutral-200">
                        <td className="py-1 align-top">
                          <span className="inline-block size-3.5 rounded-sm border border-neutral-500" />
                        </td>
                        <td className="py-1">
                          {it.name}
                          {it.variantName && <span className="text-neutral-500"> — {it.variantName}</span>}
                        </td>
                        <td className="py-1 text-right font-semibold tabular-nums">{it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {o.items.length > 8 && (
                  <div className="mt-1 text-xs text-neutral-500">+ {o.items.length - 8} more item(s) — see invoice</div>
                )}
                <div className="mt-auto flex items-end justify-between gap-4 pt-2 text-xs text-neutral-500">
                  <span>{o.notes ? `Note: ${o.notes}` : ""}</span>
                  <span className="shrink-0">
                    {qty} item{qty === 1 ? "" : "s"}
                  </span>
                </div>
              </section>
            );
          }

          return (
            <section
              key={o.id}
              className="sheet mx-auto mb-6 min-h-[277mm] bg-white p-10 shadow-sm print:mb-0 print:min-h-0 print:p-0"
              style={{ breakAfter: last ? "auto" : "page" }}
            >
              <header className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3">
                  <LogoMark className="size-10" />
                  <div className="text-sm leading-relaxed">
                    <div className="text-lg font-semibold">{shop}</div>
                    <div className="text-neutral-600">{site.address}</div>
                    <div className="text-neutral-600">
                      {[site.supportPhone, site.supportEmail].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold tracking-tight">Invoice</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Order <span className="font-medium text-neutral-900">#{o.id.slice(0, 8)}</span>
                  </div>
                  <div className="text-sm text-neutral-600">{dhakaDate(o.createdAt)}</div>
                </div>
              </header>

              <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
                <div>
                  <div className="text-xs font-medium text-neutral-500">Bill and ship to</div>
                  <div className="mt-1 font-semibold">{name}</div>
                  <div className="tabular-nums">{phone}</div>
                  {addressLines.map((l) => (
                    <div key={l}>{l}</div>
                  ))}
                  {(o.paymentEmail || o.user.email) && !o.user.email.endsWith(".invalid") && (
                    <div className="text-neutral-600">{o.paymentEmail || o.user.email}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-neutral-500">Payment</div>
                  <div className="mt-1 font-semibold">{METHOD[o.paymentMethod] ?? o.paymentMethod}</div>
                  <div>{due > 0 ? "Due on delivery" : paidOnline || o.status === "PAID" ? "Paid" : STATUS_LABEL[o.status]}</div>
                  {o.paymentTransactionId && (
                    <div className="font-mono text-xs text-neutral-600">TrxID {o.paymentTransactionId}</div>
                  )}
                  {o.courier && (
                    <div className="mt-2 text-neutral-600">
                      {COURIER_LABEL[o.courier as CourierId] ?? o.courier}
                      {o.trackingNumber && <span className="font-mono"> · {o.trackingNumber}</span>}
                    </div>
                  )}
                </div>
              </div>

              <table className="mt-8 w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-neutral-900 text-left">
                    <th className="py-2 font-semibold">Item</th>
                    <th className="py-2 text-right font-semibold">Price</th>
                    <th className="py-2 text-right font-semibold">Qty</th>
                    <th className="py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((it) => (
                    <tr key={it.id} className="border-b border-neutral-200">
                      <td className="py-2 pr-4">
                        {it.name}
                        {it.variantName && <div className="text-xs text-neutral-500">{it.variantName}</div>}
                      </td>
                      <td className="py-2 text-right tabular-nums">{money(Number(it.price))}</td>
                      <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                      <td className="py-2 text-right tabular-nums">{money(Number(it.price) * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 ml-auto w-72 text-sm">
                <Row label="Subtotal" value={money(Number(o.subtotal))} />
                {Number(o.discount) > 0 && (
                  <Row label={`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`} value={`−${money(Number(o.discount))}`} />
                )}
                <Row label="Delivery" value={Number(o.shipping) === 0 ? "Free" : money(Number(o.shipping))} />
                <div className="mt-1 flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{money(Number(o.total))}</span>
                </div>
                {due > 0 && <Row label="Amount due" value={money(due)} strong />}
                <div className="mt-1 text-right text-xs text-neutral-500">All prices include VAT.</div>
              </div>

              {o.notes && (
                <div className="mt-8 rounded-md bg-neutral-100 p-3 text-sm print:border print:bg-white">
                  <span className="font-medium">Note:</span> {o.notes}
                </div>
              )}
              <footer className="mt-12 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
                Thank you for shopping with {shop}. Questions about this order? Call {site.supportPhone}.
              </footer>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${strong ? "font-semibold" : ""}`}>
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
