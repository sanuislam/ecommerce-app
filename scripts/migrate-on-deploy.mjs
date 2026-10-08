// Runs `prisma migrate deploy` before a Vercel *production* build, so the
// database schema is always updated together with the code. Preview builds
// are skipped so feature branches never change the production database.
//
// If the migration fails the build fails, and Vercel keeps serving the
// previous deployment — the live site is never left half-migrated.
//
// Migrations must NOT run through Neon's pooler (PgBouncer, transaction
// mode): Prisma takes a session-level advisory lock, and through the pooler
// that lock can stay held by a pooled server connection after the migration
// ends — every later deploy then times out with P1002. So:
//   1. use a direct connection (DIRECT_URL / DATABASE_URL_UNPOOLED, or the
//      Neon host with "-pooler" removed);
//   2. release a lock left behind by an IDLE session (a running migration is
//      never idle, so it is left alone).
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

/** A direct (non-pooled) connection string for migrations. */
function directUrl() {
  const explicit = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED;
  if (explicit) return explicit;
  const raw = process.env.DATABASE_URL;
  try {
    const u = new URL(raw);
    // Neon: ep-xxx-pooler.region.aws.neon.tech → ep-xxx.region.aws.neon.tech
    if (u.hostname.includes("-pooler.")) {
      u.hostname = u.hostname.replace("-pooler.", ".");
      u.searchParams.delete("pgbouncer");
      return u.toString();
    }
  } catch {
    // not a URL we understand: use it as it is
  }
  return raw;
}

// Prisma Migrate's advisory lock key.
const PRISMA_LOCK_KEY = 72707369;

/** Ends idle sessions still holding Prisma's migration lock (best effort). */
async function releaseStaleLock(url) {
  let client;
  try {
    const { default: pg } = await import("pg");
    client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
    await client.connect();
    const { rows } = await client.query(
      `SELECT a.pid, a.state, now() - a.state_change AS idle_for
         FROM pg_locks l
         JOIN pg_stat_activity a ON a.pid = l.pid
        WHERE l.locktype = 'advisory'
          AND l.granted
          AND ((l.classid::bigint << 32) | l.objid::bigint) = $1
          AND a.pid <> pg_backend_pid()
          AND a.state LIKE 'idle%'`,
      [PRISMA_LOCK_KEY],
    );
    for (const r of rows) {
      await client.query("SELECT pg_terminate_backend($1)", [r.pid]);
      console.log(`[migrate] released a stale migration lock (pid ${r.pid}, ${r.state})`);
    }
  } catch (err) {
    console.log(`[migrate] could not check for a stale lock: ${err instanceof Error ? err.message : err}`);
  } finally {
    await client?.end().catch(() => {});
  }
}

const url = directUrl();
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "?";
  }
})();
console.log(`[migrate] applying database migrations (direct connection: ${host})...`);
await releaseStaleLock(url);

const run = () =>
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    // prisma.config.ts reads DIRECT_URL first.
    env: { ...process.env, DIRECT_URL: url },
  });

try {
  run();
} catch {
  console.log("[migrate] first attempt failed; checking the lock again and retrying once...");
  await new Promise((r) => setTimeout(r, 5000));
  await releaseStaleLock(url);
  run();
}
