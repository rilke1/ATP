/**
 * Applies pending Prisma migrations to a Turso/libsql database.
 *
 * Requires:
 *   DATABASE_URL        libsql://<db>.turso.io  (or file:./dev.db for local)
 *   DATABASE_AUTH_TOKEN  Turso auth token (omit for local file URLs)
 *
 * Migration state is tracked in _prisma_migrations, matching the schema
 * Prisma uses so the two systems stay compatible.
 */

import { createClient } from "@libsql/client";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { createHash, randomBytes } from "crypto";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.error("Error: DATABASE_URL is not set.");
  process.exit(1);
}

const client = createClient(authToken ? { url, authToken } : { url });

function splitStatements(sql) {
  // Split on semicolons that end a line; handles multi-line CREATE TABLE bodies.
  return sql
    .split(/;[ \t]*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  // Ensure the migration tracking table exists (same schema Prisma uses).
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  TEXT     PRIMARY KEY NOT NULL,
      "checksum"            TEXT     NOT NULL,
      "finished_at"         DATETIME,
      "migration_name"      TEXT     NOT NULL,
      "logs"                TEXT,
      "rolled_back_at"      DATETIME,
      "started_at"          DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER  NOT NULL DEFAULT 0
    )
  `);

  const { rows } = await client.execute(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  const applied = new Set(rows.map((r) => r.migration_name));

  const migrationsDir = "prisma/migrations";
  const dirs = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let count = 0;
  for (const name of dirs) {
    if (applied.has(name)) {
      console.log(`  skip  ${name}`);
      continue;
    }

    const sql = await readFile(
      join(migrationsDir, name, "migration.sql"),
      "utf-8"
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const id = randomBytes(16).toString("hex");

    console.log(`  apply ${name}`);

    // Execute the migration SQL and record it atomically in one batch.
    await client.batch(
      [
        ...splitStatements(sql),
        {
          sql: `INSERT INTO "_prisma_migrations"
                  (id, checksum, migration_name, finished_at, applied_steps_count)
                VALUES (?, ?, ?, datetime('now'), 1)`,
          args: [id, checksum, name],
        },
      ],
      "write"
    );

    count++;
  }

  if (count === 0) {
    console.log("No pending migrations.");
  } else {
    console.log(`\nApplied ${count} migration(s) successfully.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.close());
