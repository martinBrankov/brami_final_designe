/**
 * Executes migration SQL files against the production Supabase database.
 *
 * Usage:
 *   node scripts/run-migration-on-production.mjs
 */

import { readFileSync } from "fs";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Client } = pg;

const PROD_DB_URL =
  "postgresql://postgres.dzvzfblmyixazofhrxrt:3Dsmax3dsmax@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

const __dir = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  { label: "Blog (schema + data + images)", file: "migrate-blog-to-production.sql" },
  { label: "Orders (schema + data)",        file: "migrate-orders-to-production.sql" },
];

async function run() {
  const client = new Client({ connectionString: PROD_DB_URL, ssl: { rejectUnauthorized: false } });

  console.log("Connecting to production database...");
  await client.connect();
  console.log("Connected.\n");

  for (const { label, file } of MIGRATIONS) {
    const path = join(__dir, file);
    const sql = readFileSync(path, "utf8");

    console.log(`── Running: ${label} (${file})`);
    try {
      await client.query(sql);
      console.log(`   ✓ Done\n`);
    } catch (err) {
      console.error(`   ✗ ERROR: ${err.message}\n`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("All migrations completed successfully.");
}

run().catch((err) => { console.error(err.message); process.exit(1); });
