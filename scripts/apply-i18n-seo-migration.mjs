/**
 * Applies the i18n + SEO migration:
 *   032 — slug, SEO fields and `translations` JSONB on products, blog, FAQ
 *
 * Usage:
 *   node scripts/apply-i18n-seo-migration.mjs --target=dev
 *   node scripts/apply-i18n-seo-migration.mjs --target=prod
 *   node scripts/apply-i18n-seo-migration.mjs --db-url=postgresql://...
 *
 * Connection string is taken from (in order):
 *   --db-url=...            explicit
 *   --target=dev           -> DEV_SUPABASE_DB_URL
 *   --target=prod          -> SUPABASE_DB_URL
 *
 * All statements use IF NOT EXISTS, so the script is
 * safe to re-run.
 */

const MIGRATION_FILES = ["032_i18n_seo.sql", "033_unique_translated_slugs.sql"];

import { Client } from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvFile() {
  try {
    const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
    return Object.fromEntries(
      envContent
        .split("\n")
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const eqIndex = line.indexOf("=");
          return eqIndex > -1
            ? [line.slice(0, eqIndex).trim(), line.slice(eqIndex + 1).trim()]
            : null;
        })
        .filter(Boolean),
    );
  } catch {
    return {};
  }
}

function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => {
        const [rawKey, ...rawValue] = arg.slice(2).split("=");
        return [rawKey, rawValue.join("=") || "true"];
      }),
  );
}

function getDatabaseUrl(env, args) {
  if (args["db-url"]) return String(args["db-url"]);
  const target = String(args.target || "dev").toLowerCase();
  if (target === "prod") return env.PROD_DATABASE_URL || process.env.PROD_DATABASE_URL || env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;
  return env.DEV_SUPABASE_DB_URL || process.env.DEV_SUPABASE_DB_URL;
}

async function run() {
  const env = readEnvFile();
  const args = parseArgs(process.argv.slice(2));
  const target = String(args.target || "dev").toLowerCase();
  const dbUrl = getDatabaseUrl(env, args);

  if (!dbUrl) {
    console.error(
      `Missing database URL. Set ${
        target === "prod" ? "SUPABASE_DB_URL" : "DEV_SUPABASE_DB_URL"
      } in .env.local or pass --db-url=postgresql://...`,
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Connecting to ${target} database...`);
  await client.connect();
  console.log("Connected.\n");

  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(
      resolve(__dirname, "../supabase/migrations", file),
      "utf-8",
    );
    console.log(`── Running: ${file}`);
    try {
      await client.query(sql);
      console.log("   ✓ Done");
    } catch (err) {
      console.error(`   ✗ ERROR: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("\ni18n + SEO migration applied successfully.");
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
