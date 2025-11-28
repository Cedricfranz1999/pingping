import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

// Normalize DATABASE_URL at runtime to be safe with Supabase + PgBouncer
// - Enforce sslmode=require for Supabase
// - Enable pgBouncer mode
// - Cap connection_limit to 1 to avoid pool exhaustion in serverless-like runtimes
const normalizeDbUrl = (raw: string) => {
  try {
    const u = new URL(raw);
    const host = u.hostname;
    const isSupabase = host.includes("supabase.com");
    const isPooler = host.includes("pooler.supabase.com");

    if (isSupabase && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    if (isPooler) {
      // Ensure Prisma uses PgBouncer-compatible mode
      u.searchParams.set("pgbouncer", "true");
      // Keep connections low to avoid checkout timeouts
      if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
      // Increase wait time for a free connection in Prisma's internal pool
      if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "30");
    }
    return u.toString();
  } catch {
    return raw;
  }
};

const createPrismaClient = (url: string) =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url,
      },
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  prismaUrl: string | undefined;
};

// Compute the desired URL once per module load
const desiredUrl = normalizeDbUrl(
  env.NODE_ENV === "development" && env.DIRECT_URL ? env.DIRECT_URL : env.DATABASE_URL,
);

if (globalForPrisma.prisma && globalForPrisma.prismaUrl !== desiredUrl) {
  // URL changed (e.g., code updated). Recreate the client.
  globalForPrisma.prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? createPrismaClient(desiredUrl);

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaUrl = desiredUrl;
}
