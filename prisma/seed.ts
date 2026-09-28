import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma";
import { createDbAdapter } from "../src/lib/db-adapter";
import { loadDemoCatalog } from "../src/lib/demo-loader";
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

  const demo = await loadDemoCatalog(prisma);
  console.log(`  Demo catalogue: ${demo.created} new, ${demo.updated} refreshed products`);

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
