import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryManager } from "@/components/admin/category-manager";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                    <TableCell>{c._count.products}</TableCell>
                    <TableCell className="text-right">
                      <DeleteCategoryButton id={c.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <aside className="h-fit rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold">New category</h2>
          <CategoryManager />
        </aside>
      </div>
    </div>
  );
}
