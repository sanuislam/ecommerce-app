import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma";
import { createDbAdapter } from "../src/lib/db-adapter";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  throw new Error(
    "Refusing to seed demo data with NODE_ENV=production. Set SEED_ALLOW_PRODUCTION=1 if you really mean it.",
  );
}
const prisma = new PrismaClient({
  adapter: createDbAdapter(connectionString),
});

// Demo size / colour options for apparel products.
const APPAREL_VARIANTS: Record<string, { size: string; color: string; stock: number }[]> = {
  "minimalist-tee": ["S", "M", "L", "XL"].flatMap((size) =>
    ["White", "Black"].map((color) => ({ size, color, stock: 15 })),
  ),
  "classic-hoodie": ["M", "L", "XL"].map((size) => ({ size, color: "", stock: 20 })),
};

const CATEGORIES = [
  { name: "Apparel", slug: "apparel", description: "Clothing and wearables." },
  { name: "Accessories", slug: "accessories", description: "Small but mighty." },
  { name: "Home", slug: "home", description: "For your space." },
  { name: "Tech", slug: "tech", description: "Gadgets & gear." },
];

const PRODUCTS = [
  {
    name: "Minimalist Tee",
    slug: "minimalist-tee",
    description: "A crisp, everyday tee in a beautifully soft cotton blend.",
    price: 2640,
    compareAt: 3520,
    stock: 120,
    featured: true,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
    ],
    categorySlug: "apparel",
  },
  {
    name: "Classic Hoodie",
    slug: "classic-hoodie",
    description: "Heavyweight fleece, relaxed fit, built to last.",
    price: 6820,
    stock: 80,
    featured: true,
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80",
    ],
    categorySlug: "apparel",
  },
  {
    name: "Leather Wallet",
    slug: "leather-wallet",
    description: "Full-grain leather, hand-stitched with six card slots.",
    price: 5280,
    stock: 40,
    images: [
      "https://images.unsplash.com/photo-1517463700628-5103184eac47?w=1200&q=80",
    ],
    categorySlug: "accessories",
  },
  {
    name: "Canvas Tote",
    slug: "canvas-tote",
    description: "14oz canvas with reinforced straps and an inner pocket.",
    price: 3080,
    stock: 150,
    featured: true,
    images: [
      "https://images.unsplash.com/photo-1544441893-675973e31985?w=1200&q=80",
    ],
    categorySlug: "accessories",
  },
  {
    name: "Ceramic Mug",
    slug: "ceramic-mug",
    description: "Hand-thrown ceramic mug with a matte glaze finish.",
    price: 1980,
    stock: 200,
    images: [
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=1200&q=80",
    ],
    categorySlug: "home",
  },
  {
    name: "Linen Throw",
    slug: "linen-throw",
    description: "Soft, breathable linen perfect for cozy afternoons.",
    price: 8580,
    stock: 30,
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    ],
    categorySlug: "home",
  },
  {
    name: "Wireless Earbuds",
    slug: "wireless-earbuds",
    description: "True wireless earbuds with active noise cancellation.",
    price: 16390,
    compareAt: 19690,
    stock: 60,
    featured: true,
    images: [
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=1200&q=80",
    ],
    categorySlug: "tech",
  },
  {
    name: "Desk Lamp",
    slug: "desk-lamp",
    description: "Sculptural LED lamp with dimmable warm-to-cool light.",
    price: 9790,
    stock: 25,
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1200&q=80",
    ],
    categorySlug: "tech",
  },
];

async function main() {
  // Override these in .env for any shared / deployed database.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@eidbazar.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
  const userEmail = process.env.SEED_USER_EMAIL ?? "user@eidbazar.com";
  const userPassword = process.env.SEED_USER_PASSWORD ?? "user1234";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Nova Admin",
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: "Nova Shopper",
      role: Role.USER,
      passwordHash: await bcrypt.hash(userPassword, 10),
    },
  });

  const categoryBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const rec = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, description: c.description },
    });
    categoryBySlug.set(c.slug, rec.id);
  }

  for (const p of PRODUCTS) {
    const data = {
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      compareAt: p.compareAt ?? null,
      stock: p.stock,
      featured: p.featured ?? false,
      images: p.images,
      categoryId: categoryBySlug.get(p.categorySlug) ?? null,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: data,
    });

    const variants = APPAREL_VARIANTS[p.slug];
    if (variants) {
      for (const [position, v] of variants.entries()) {
        await prisma.productVariant.upsert({
          where: {
            productId_size_color: {
              productId: product.id,
              size: v.size,
              color: v.color,
            },
          },
          update: {},
          create: { productId: product.id, ...v, position },
        });
      }
      const agg = await prisma.productVariant.aggregate({
        where: { productId: product.id },
        _sum: { stock: true },
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: agg._sum.stock ?? 0 },
      });
    }
  }

  await prisma.coupon.upsert({
    where: { code: "EID10" },
    update: {},
    create: {
      code: "EID10",
      description: "10% off your order (max ৳500)",
      type: "PERCENT",
      value: 10,
      maxDiscount: 500,
    },
  });

  console.log("Seed complete.");
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  User:  ${userEmail} / ${userPassword}`);
  console.log("  Coupon: EID10");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
