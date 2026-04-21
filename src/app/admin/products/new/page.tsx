import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <div className="mt-6 max-w-3xl">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
