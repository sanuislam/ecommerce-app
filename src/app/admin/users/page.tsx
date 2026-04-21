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

export default async function AdminUsersPage() {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
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
                      {u.email}
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
    </div>
  );
}
