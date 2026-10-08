import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { position: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="p-4 sm:p-6">
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
            flashDeal: product.flashDeal,
            flashDealDiscount: product.flashDealDiscount,
            published: product.published,
            categoryId: product.categoryId,
            costPrice: product.costPrice != null ? Number(product.costPrice) : null,
            lowStockAt: product.lowStockAt,
            tags: product.tags,
            variants: product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              price: v.price != null ? Number(v.price) : null,
              stock: v.stock,
              sku: v.sku,
              costPrice: v.costPrice != null ? Number(v.costPrice) : null,
            })),
          }}
        />
      </div>
    </div>
  );
}
