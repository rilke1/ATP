import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI tooling (migrate dev, generate) targets a local SQLite file.
    // Runtime connections to Turso go through lib/prisma.ts instead.
    url: process.env.LOCAL_DATABASE_URL ?? "file:./dev.db",
  },
});
