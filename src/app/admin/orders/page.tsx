import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } }, items: true },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      #{o.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{o.user.email}</TableCell>
                  <TableCell>{o.items.length}</TableCell>
                  <TableCell>{formatPrice(Number(o.total))}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.status === "PAID" || o.status === "DELIVERED"
                          ? "default"
                          : o.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(o.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
