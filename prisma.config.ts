import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // In Prisma 7 the URL is configured here, not in schema.prisma.
    // For local dev: DATABASE_URL=file:./dev.db  (see .env)
    // For Turso:     DATABASE_URL=libsql://<db>.turso.io?authToken=<token>
    url: process.env.DATABASE_URL!,
  },
});
