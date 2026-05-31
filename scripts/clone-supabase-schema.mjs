/**
 * Schema clone script: applies local Supabase SQL migrations to a target project.
 *
 * Usage:
 *   node scripts/clone-supabase-schema.mjs --target=dev
 *   node scripts/clone-supabase-schema.mjs --db-url=postgresql://...
 *
 * Required env for --target=dev:
 *   DEV_SUPABASE_DB_URL
 *
 * Optional targets:
 *   --target=prod uses SUPABASE_DB_URL
 */

import { Client } from "pg";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvFile() {
  const envPath = resolve(__dirname, "../.env.local");
  const envContent = readFileSync(envPath, "utf-8");

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
  if (args["db-url"]) {
    return String(args["db-url"]);
  }

  const target = String(args.target || "dev").toLowerCase();

  if (target === "dev") {
    return env.DEV_SUPABASE_DB_URL;
  }

  if (target === "prod") {
    return env.SUPABASE_DB_URL;
  }

  throw new Error(`Unsupported target "${target}". Use --target=dev or --db-url=...`);
}

function getMigrationFiles() {
  const migrationsDir = resolve(__dirname, "../supabase/migrations");

  if (!existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => ({
      fileName,
      fullPath: resolve(migrationsDir, fileName),
      sql: readFileSync(resolve(migrationsDir, fileName), "utf-8"),
    }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = readEnvFile();
  const databaseUrl = getDatabaseUrl(env, args);

  if (!databaseUrl) {
    throw new Error(
      "Missing target database URL. Set DEV_SUPABASE_DB_URL in .env.local or pass --db-url=...",
    );
  }

  const migrations = getMigrationFiles().filter((migration) =>
    args.only ? migration.fileName === String(args.only) : true,
  );

  if (!migrations.length) {
    throw new Error("No matching migrations found.");
  }
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    for (const migration of migrations) {
      console.log(`Applying ${migration.fileName}...`);
      await client.query(migration.sql);
    }

    console.log("Schema clone complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = error?.message || String(error);

  if (message.includes("ENOTFOUND")) {
    console.error(
      [
        "Schema clone failed: database host could not be resolved.",
        "Use the Postgres connection string from Supabase Dashboard -> Connect -> Session pooler or Direct connection.",
        "If db.<project-ref>.supabase.co does not resolve on your machine, prefer the pooler host in DEV_SUPABASE_DB_URL.",
      ].join(" "),
    );
    process.exit(1);
  }

  console.error("Schema clone failed:", message);
  process.exit(1);
});
