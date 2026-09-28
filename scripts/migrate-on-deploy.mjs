// Runs `prisma migrate deploy` before a Vercel *production* build, so the
// database schema is always updated together with the code. Preview builds
// are skipped so feature branches never change the production database.
//
// If the migration fails the build fails, and Vercel keeps serving the
// previous deployment — the live site is never left half-migrated.
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
if (env && env !== "production") {
  console.log(`[migrate] VERCEL_ENV=${env}: skipping database migrations`);
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log("[migrate] DATABASE_URL not set: skipping database migrations");
  process.exit(0);
}
console.log("[migrate] applying database migrations...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });
