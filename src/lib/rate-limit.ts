import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Fixed-window rate limiter backed by Postgres, so it holds across
 * serverless instances. Returns true when the call is allowed.
 * Fails open if the database is unreachable (logins must not break).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;
    return (rows[0]?.count ?? 0) <= limit;
  } catch (err) {
    console.error("rateLimit failed", err);
    return true;
  }
}

/** Best-effort client IP from proxy headers. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Deletes expired counters; call occasionally (e.g. from the cleanup cron). */
export async function pruneRateLimits() {
  await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
}
