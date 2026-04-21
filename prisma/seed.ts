import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, Role } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

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
  const adminEmail = "admin@eidbazar.com";
  const adminPassword = "admin1234";
  const userEmail = "user@eidbazar.com";
  const userPassword = "user1234";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN },
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
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: data,
    });
  }

  console.log("Seed complete.");
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  User:  ${userEmail} / ${userPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
