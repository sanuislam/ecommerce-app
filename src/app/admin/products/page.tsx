import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { DeleteProductButton } from "@/components/admin/delete-product-button";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" /> New product
          </Link>
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  No products yet.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.category?.name ?? "—"}</TableCell>
                  <TableCell>{formatPrice(Number(p.price))}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.published ? "default" : "secondary"}>
                      {p.published ? "Published" : "Draft"}
                    </Badge>
                    {p.featured && <Badge className="ml-1" variant="outline">Featured</Badge>}
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                    </Button>
                    <DeleteProductButton id={p.id} />
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
