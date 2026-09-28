import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductsPage, { generateMetadata as productsMetadata } from "../../products/page";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

/**
 * Clean, indexable category URLs (/category/panjabi) that render the normal
 * product listing filtered to that category.
 */
async function withCategory({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const exists = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!exists) notFound();
  return Promise.resolve({ ...sp, category: slug });
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  return productsMetadata({ searchParams: Promise.resolve({ ...sp, category: slug }) });
}

export default async function CategoryPage(props: Props) {
  const searchParams = await withCategory(props);
  return ProductsPage({ searchParams: Promise.resolve(searchParams) });
}
