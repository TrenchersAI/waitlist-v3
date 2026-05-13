import "dotenv/config";

import { defineConfig } from "prisma/config";

/**
 * Prisma 7+: CLI (`db push`, `migrate`, `studio`) reads the DB URL from here.
 * Runtime `PrismaClient` still uses `DATABASE_URL` in `src/lib/prisma.ts`.
 *
 * Supabase: `DATABASE_URL` often points at PgBouncer (`:6543`), which can make
 * `prisma db push` hang or run very slowly. Use `DIRECT_URL` (`:5432`, session)
 * for schema commands — same pattern as `.env.example`.
 */
function cliDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const pooled = process.env.DATABASE_URL?.trim();
  const url = direct || pooled;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL (and optional DIRECT_URL) in .env for Prisma CLI.",
    );
  }
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: cliDatabaseUrl(),
  },
});
