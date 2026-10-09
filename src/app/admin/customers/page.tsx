import Link from "next/link";
import { Download, Megaphone } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatPrice } from "@/lib/utils";
import { audienceLabel, countCustomers, listCustomers, parseAudience, SORTS, type Sort } from "@/lib/segments";
import { AudienceForm, audienceQuery } from "@/components/admin/audience-form";
import { ListPager } from "@/components/admin/list-pager";
import { SmsOptOutToggle } from "@/components/admin/sms-optout-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PAGE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const SORT_LABEL: Record<Sort, string> = { spent: "Most spent", orders: "Most orders", recent: "Last order", joined: "Newest" };
const date = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function CustomersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const a = parseAudience(sp);
  const sortRaw = typeof sp.sort === "string" ? sp.sort : "";
  const sort: Sort = sortRaw in SORTS ? (sortRaw as Sort) : "spent";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(String(sp.page ?? "1"), 10) || 1));
  const session = await auth();
  const canMarket = can(session?.user?.role, session?.user?.staffRole, "marketing");

  const [rows, count, categories] = await Promise.all([
    listCustomers(a, { sort, skip: (page - 1) * PAGE, take: PAGE }),
    countCustomers(a),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const catName = categories.find((c) => c.id === a.categoryId)?.name;
  const base = audienceQuery(a, { sort: sort === "spent" ? "" : sort });
  const pagerAction = `/admin/customers${base ? `?${base}` : ""}`;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {audienceLabel(a, catName)}: {count.total} customer{count.total === 1 ? "" : "s"} · {formatPrice(count.spent)}{" "}
            spent · {count.reachable} reachable by SMS
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/customers/export?${audienceQuery(a, { q: a.q })}`}>
              <Download className="size-4" /> CSV
            </a>
          </Button>
          {canMarket ? (
            <Button asChild size="sm">
              <Link href={`/admin/campaigns/new?${audienceQuery(a)}`}>
                <Megaphone className="size-4" /> SMS this group
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <AudienceForm action="/admin/customers" audience={a} categories={categories} search hidden={sort !== "spent" ? { sort } : {}} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Sort:</span>
        {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
          <Link
            key={s}
            href={`/admin/customers?${audienceQuery(a, { q: a.q, sort: s === "spent" ? "" : s })}`}
            className={cn("rounded-md px-2 py-1", sort === s ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted")}
          >
            {SORT_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Phone · district</th>
              <th className="p-3 text-right font-medium">Orders</th>
              <th className="p-3 text-right font-medium">Spent</th>
              <th className="p-3 font-medium">Last order</th>
              <th className="p-3 font-medium" title="Promotional SMS (order messages always go)">
                Promo SMS
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No customers in this group.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const phoneOnly = c.email.endsWith(".invalid");
                return (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{c.name || (phoneOnly ? "Phone customer" : c.email)}</div>
                      {!phoneOnly && c.name ? <div className="text-xs text-muted-foreground">{c.email}</div> : null}
                      <div className="text-xs text-muted-foreground">Joined {date(c.createdAt)}</div>
                    </td>
                    <td className="p-3">
                      <div className="tabular-nums">{c.phone ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.district ?? ""}</div>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {c.orders ? (
                        <Link
                          href={`/admin/orders?q=${encodeURIComponent(phoneOnly ? (c.phone ?? "") : c.email)}`}
                          className="hover:underline"
                        >
                          {c.orders}
                        </Link>
                      ) : (
                        0
                      )}
                      {c.orders >= 2 ? (
                        <Badge variant="secondary" className="ml-1.5 align-middle text-[10px]">
                          repeat
                        </Badge>
                      ) : null}
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums">{formatPrice(c.spent)}</td>
                    <td className="p-3 text-muted-foreground">{date(c.lastOrder)}</td>
                    <td className="p-3">
                      <SmsOptOutToggle userId={c.id} optedOut={c.smsOptOut} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ListPager action={pagerAction} q={a.q} page={page} pageSize={PAGE} total={count.total} noun="customers" />
    </div>
  );
}
