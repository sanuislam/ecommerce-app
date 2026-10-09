import Link from "next/link";
import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { ListPager } from "@/components/admin/list-pager";

export const dynamic = "force-dynamic";
const PAGE = 30;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function CampaignsPage({ searchParams }: Props) {
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const [rows, total] = await Promise.all([
    prisma.smsCampaign.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.smsCampaign.count(),
  ]);
  const authors = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.createdById).filter((x): x is string => !!x) } },
    select: { id: true, email: true, name: true },
  });
  const by = new Map(authors.map((a) => [a.id, a.name || a.email]));
  const sending = rows.some((r) => r.status === "sending");

  return (
    <div className="p-4 sm:p-6">
      <AutoRefresh active={sending} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SMS campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Promotional SMS to a group of customers: an Eid offer, new arrivals, a coupon for people who haven&apos;t
            ordered in a while. Customers who turned off promotional SMS never get them.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/campaigns/new">
            <Megaphone className="size-4" /> New campaign
          </Link>
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Campaign</th>
              <th className="p-3 font-medium">Group</th>
              <th className="p-3 text-right font-medium">Numbers</th>
              <th className="p-3 text-right font-medium">SMS used</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Sent</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const label = (c.audience as { label?: string } | null)?.label ?? "";
                return (
                  <tr key={c.id} className="border-b align-top last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="mt-0.5 max-w-md text-xs whitespace-pre-wrap text-muted-foreground">{c.message}</div>
                    </td>
                    <td className="p-3 text-xs">{label}</td>
                    <td className="p-3 text-right tabular-nums">{c.recipients}</td>
                    <td className="p-3 text-right tabular-nums">{c.sent * c.smsParts}</td>
                    <td className="p-3">
                      {c.status === "sending" ? (
                        <Badge variant="outline">
                          Sending {c.sent + c.failed}/{c.recipients}
                        </Badge>
                      ) : c.status === "done" ? (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                          Sent {c.sent}
                          {c.failed ? ` · ${c.failed} failed` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                      {c.error ? <div className="mt-1 max-w-48 text-xs text-destructive">{c.error}</div> : null}
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">
                      {c.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}
                      <div>{c.createdById ? by.get(c.createdById) : ""}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ListPager action="/admin/campaigns" q="" page={page} pageSize={PAGE} total={total} noun="campaigns" />
    </div>
  );
}
