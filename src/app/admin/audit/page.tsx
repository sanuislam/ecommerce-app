import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_GROUPS, AUDIT_LABEL } from "@/lib/audit";
import { ListPager, listParams } from "@/components/admin/list-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";
const PAGE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TARGET_HREF: Record<string, (id: string) => string> = {
  order: (id) => `/admin/orders/${id}`,
  product: (id) => `/admin/products/${id}`,
  return: (id) => `/admin/returns/${id}`,
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AuditPage({ searchParams }: Props) {
  const session = await adminSession("owner");
  if (!session) redirect("/admin");
  const sp = await searchParams;
  const { q, page } = listParams(sp);
  const group = one(sp.group);
  const who = one(sp.who);
  const target = one(sp.target).trim().slice(0, 60);

  const where: Prisma.AuditLogWhereInput = {
    ...(group && group in AUDIT_GROUPS ? { action: { startsWith: `${group}.` } } : {}),
    ...(who ? { userId: who } : {}),
    ...(target ? { targetId: target } : {}),
    ...(q
      ? {
          OR: [
            { summary: { contains: q, mode: "insensitive" } },
            { userLabel: { contains: q, mode: "insensitive" } },
            { targetId: q },
          ],
        }
      : {}),
  };

  const [rows, total, people] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    }),
  ]);

  const keep = new URLSearchParams();
  if (group) keep.set("group", group);
  if (who) keep.set("who", who);
  if (target) keep.set("target", target);
  const action = `/admin/audit${keep.size ? `?${keep}` : ""}`;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every change made in the admin panel: who, what and when. Entries can&apos;t be edited or deleted.
      </p>

      <form method="get" action="/admin/audit" className="mt-4 flex flex-wrap items-end gap-2">
        <select
          name="group"
          defaultValue={group}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Area"
        >
          <option value="">All areas</option>
          {Object.entries(AUDIT_GROUPS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="who" defaultValue={who} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Person">
          <option value="">Everyone</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.email}
            </option>
          ))}
        </select>
        <Input name="q" defaultValue={q} placeholder="Search text or an ID" className="h-9 w-56" />
        {target ? <input type="hidden" name="target" value={target} /> : null}
        <Button type="submit" variant="secondary" size="sm" className="h-9">
          Filter
        </Button>
        {group || who || q || target ? (
          <Button asChild variant="ghost" size="sm" className="h-9">
            <Link href="/admin/audit">Clear</Link>
          </Button>
        ) : null}
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium whitespace-nowrap">When</th>
              <th className="p-3 font-medium">Who</th>
              <th className="p-3 font-medium">What</th>
              <th className="p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Nothing here yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const href = r.targetType && r.targetId ? TARGET_HREF[r.targetType]?.(r.targetId) : undefined;
                return (
                  <tr key={r.id} className="border-b align-top last:border-0">
                    <td className="p-3 whitespace-nowrap text-muted-foreground tabular-nums">
                      {r.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="p-3">
                      <div>{r.userLabel || "—"}</div>
                      {r.ip ? <div className="text-xs text-muted-foreground">{r.ip}</div> : null}
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium">{AUDIT_LABEL[r.action] ?? r.action}</td>
                    <td className="p-3">
                      <div>{r.summary}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {href ? (
                          <Link href={href} className="underline">
                            Open
                          </Link>
                        ) : null}
                        {r.targetId ? (
                          <Link href={`/admin/audit?target=${encodeURIComponent(r.targetId)}`} className="underline">
                            History of this {r.targetType ?? "item"}
                          </Link>
                        ) : null}
                        {r.data ? (
                          <details>
                            <summary className="cursor-pointer">Data</summary>
                            <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-muted p-2 text-[11px] whitespace-pre-wrap">
                              {JSON.stringify(r.data, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ListPager action={action} q={q} page={page} pageSize={PAGE} total={total} noun="entries" />
    </div>
  );
}
