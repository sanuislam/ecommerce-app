import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DemoCatalogCard } from "@/components/admin/demo-catalog-card";
import { ListPager, ListSearch, listParams } from "@/components/admin/list-pager";
import { ProductsTable } from "@/components/admin/products-table";
import { getOrderSettings } from "@/lib/order-settings";

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
          { tags: { has: q.toLowerCase().replace(/^#/, "") } },
        ],
      }
    : {};
  const [products, matching, allCount, categories, rules] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { category: true, _count: { select: { variants: true } } },
    }),
    prisma.product.count({ where }),
    prisma.product.count(),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getOrderSettings(),
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

      <ProductsTable
        categories={categories}
        rows={products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category?.name ?? null,
          price: formatPrice(Number(p.price)),
          stock: p.stock,
          options: p._count.variants,
          low: p.stock <= (p.lowStockAt ?? rules.lowStockDefault),
          published: p.published,
          featured: p.featured,
          tags: p.tags,
        }))}
      />
      <ListPager action="/admin/products" q={q} page={page} pageSize={PAGE} total={matching} noun="products" />
    </div>
  );
}
