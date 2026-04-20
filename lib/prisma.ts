import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL!;
  // DATABASE_AUTH_TOKEN is required for Turso.
  // For local SQLite (file:./dev.db) leave it unset.
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const config = authToken ? { url, authToken } : { url };
  const adapter = new PrismaLibSql(config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
