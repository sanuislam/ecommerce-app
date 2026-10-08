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
import { DemoCatalogCard } from "@/components/admin/demo-catalog-card";
import { ListPager, ListSearch, listParams } from "@/components/admin/list-pager";

const PAGE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminProductsPage({ searchParams }: Props) {
  const { q, page } = listParams(await searchParams);
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q.toLowerCase() } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : {};
  const [products, matching, allCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { category: true, _count: { select: { variants: true } } },
    }),
    prisma.product.count({ where }),
    prisma.product.count(),
  ]);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" /> New product
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <DemoCatalogCard productCount={allCount} />
      </div>

      <div className="mt-6">
        <ListSearch action="/admin/products" q={q} placeholder="Name or SKU" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
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
                  <TableCell className="max-w-64 truncate font-medium" title={p.name}>{p.name}</TableCell>
                  <TableCell>{p.category?.name ?? "—"}</TableCell>
                  <TableCell>{formatPrice(Number(p.price))}</TableCell>
                  <TableCell>
                    {p.stock}
                    {p._count.variants > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({p._count.variants} options)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.published ? "default" : "secondary"}>
                      {p.published ? "Published" : "Draft"}
                    </Badge>
                    {p.featured && <Badge className="ml-1" variant="outline">Featured</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                      </Button>
                      <DeleteProductButton id={p.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <ListPager action="/admin/products" q={q} page={page} pageSize={PAGE} total={matching} noun="products" />
    </div>
  );
}
