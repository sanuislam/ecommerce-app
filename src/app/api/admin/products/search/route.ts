import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { unitPrice, variantLabel } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/** Products for the admin order editor: name search, with options and stock. */
export async function GET(req: Request) {
  if (!(await adminSession("orders"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  const products = await prisma.product.findMany({
    where: {
      published: true,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }] } : {}),
    },
    include: { variants: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });
  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.images[0] ?? null,
      price: unitPrice(p),
      stock: p.stock,
      variants: p.variants.map((v) => ({
        id: v.id,
        label: variantLabel(v),
        price: unitPrice(p, v),
        stock: v.stock,
      })),
    })),
  });
}
