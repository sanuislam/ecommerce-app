import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { ListPager, ListSearch, listParams } from "@/components/admin/list-pager";

const PAGE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  const currentUserId = session?.user?.id;
  const { q, page } = listParams(await searchParams);
  const digits = q.replace(/\D/g, "");
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
          ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-10) } }] : []),
        ],
      }
    : {};

  const [users, matching] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <div className="mt-4">
        <ListSearch action="/admin/users" q={q} placeholder="Name, e-mail or phone" />
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.email.endsWith(".invalid") ? (
                        <span className="text-muted-foreground">Phone customer · {u.phone}</span>
                      ) : (
                        u.email
                      )}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{u.name ?? "—"}</TableCell>
                    <TableCell>
                      <UserRoleSelect
                        userId={u.id}
                        role={u.role}
                        disabled={isSelf}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u._count.orders}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <ListPager action="/admin/users" q={q} page={page} pageSize={PAGE} total={matching} noun="users" />
    </div>
  );
}
