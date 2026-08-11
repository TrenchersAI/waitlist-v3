import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  // Cap the pool explicitly. Supabase's pooler enforces a server-side limit
  // (200) shared across EVERY client: this process, every other script, and
  // every concurrently-warm Vercel function. A high-rate send makes that
  // ceiling easy to hit from an unexpected direction, because each delivery
  // webhook wakes a serverless function that opens its own connection, so a
  // burst of a few hundred emails becomes a burst of a few hundred
  // connections. That is exactly how the feature send died at batch 4 with
  // `EMAXCONN max client connections reached`.
  //
  // A small cap here is not a throughput loss: these scripts are network
  // bound on Resend, not on Postgres.
  const adapter = new PrismaPg({
    connectionString,
    max: 8,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });

  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
