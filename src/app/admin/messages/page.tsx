import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseOrderNo } from "@/lib/order-number";
import { ListPager } from "@/components/admin/list-pager";
import { MessageHandledButton } from "@/components/admin/message-handled-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PAGE = 30;

type Props = { searchParams: Promise<{ show?: string; page?: string }> };

export default async function MessagesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const show = sp.show === "handled" ? "handled" : sp.show === "all" ? "all" : "open";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const where = show === "open" ? { handledAt: null } : show === "handled" ? { handledAt: { not: null } } : {};
  const [rows, total, openCount] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { handledAt: null } }),
  ]);
  const numbers = rows.map((r) => parseOrderNo(r.orderRef)).filter((n): n is number => n != null && n < 2_147_483_647);
  const orders = numbers.length
    ? await prisma.order.findMany({ where: { number: { in: numbers } }, select: { id: true, number: true } })
    : [];
  const orderBy = new Map(orders.map((o) => [o.number, o.id]));

  return (
    <div className="max-w-4xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sent from the Contact page. {openCount} waiting for a reply.</p>
      <div className="mt-4 flex gap-1.5 text-sm">
        {(["open", "handled", "all"] as const).map((k) => (
          <Link
            key={k}
            href={`/admin/messages?show=${k}`}
            className={cn("rounded-full border px-3 py-1", show === k ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
          >
            {k === "open" ? `Waiting (${openCount})` : k === "handled" ? "Handled" : "All"}
          </Link>
        ))}
      </div>
      <ul className="mt-4 grid gap-3">
        {rows.length === 0 ? (
          <li className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">No messages here.</li>
        ) : (
          rows.map((m) => {
            const no = parseOrderNo(m.orderRef);
            const orderId = no != null ? orderBy.get(no) : undefined;
            return (
              <li key={m.id} className={cn("rounded-lg border bg-card p-4", m.handledAt && "opacity-70")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {m.phone ? (
                        <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:underline">
                          <Phone className="size-3" /> {m.phone}
                        </a>
                      ) : null}
                      {m.email ? (
                        <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 hover:underline">
                          <Mail className="size-3" /> {m.email}
                        </a>
                      ) : null}
                      {m.orderRef ? (
                        orderId ? (
                          <Link href={`/admin/orders/${orderId}`} className="underline">
                            Order {m.orderRef}
                          </Link>
                        ) : (
                          <span>Order {m.orderRef}</span>
                        )
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {m.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}
                    {m.handledAt ? <div>Handled by {m.handledBy}</div> : null}
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{m.message}</p>
                <div className="mt-3">
                  <MessageHandledButton id={m.id} handled={!!m.handledAt} />
                </div>
              </li>
            );
          })
        )}
      </ul>
      <ListPager action={`/admin/messages?show=${show}`} q="" page={page} pageSize={PAGE} total={total} noun="messages" />
    </div>
  );
}
