import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
      <div className="mt-6 max-w-3xl">
        <ProductForm
          categories={categories}
          initial={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: Number(product.price),
            compareAt: product.compareAt != null ? Number(product.compareAt) : null,
            stock: product.stock,
            images: product.images,
            featured: product.featured,
            published: product.published,
            categoryId: product.categoryId,
          }}
        />
      </div>
    </div>
  );
}
