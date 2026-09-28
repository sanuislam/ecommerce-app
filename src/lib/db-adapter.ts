import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Picks the Prisma driver adapter for a connection string.
 *
 * Neon's serverless driver talks to Neon over WebSockets and cannot reach a
 * plain Postgres server, so local / self-hosted databases use node-postgres.
 * Set DATABASE_DRIVER=neon|pg to override the auto-detection.
 */
export function createDbAdapter(connectionString: string) {
  const forced = process.env.DATABASE_DRIVER?.toLowerCase();
  const isNeon =
    forced === "neon" ||
    (forced !== "pg" && /\.neon\.tech|\.neon\.build/i.test(connectionString));
  return isNeon
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
}
