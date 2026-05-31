/**
 * Sync serial/identity sequences with current table data.
 *
 * Usage:
 *   node scripts/sync-supabase-sequences.mjs --target=dev
 *   node scripts/sync-supabase-sequences.mjs --db-url=postgresql://...
 */

import { Client } from "pg";
import { readFileSync } from "fs";
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = readEnvFile();
  const databaseUrl = getDatabaseUrl(env, args);

  if (!databaseUrl) {
    throw new Error(
      "Missing target database URL. Set DEV_SUPABASE_DB_URL in .env.local or pass --db-url=...",
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT
        table_schema,
        table_name,
        column_name,
        pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) AS sequence_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) IS NOT NULL
      ORDER BY table_name, column_name
    `);

    for (const row of rows) {
      const qualifiedTable = `"${row.table_schema}"."${row.table_name}"`;
      const quotedColumn = `"${row.column_name}"`;
      const sequenceName = row.sequence_name;

      console.log(`Syncing ${row.table_name}.${row.column_name} -> ${sequenceName}`);

      await client.query(
        `
          SELECT setval(
            $1,
            COALESCE((SELECT MAX(${quotedColumn}) FROM ${qualifiedTable}), 0),
            COALESCE((SELECT MAX(${quotedColumn}) FROM ${qualifiedTable}), 0) > 0
          )
        `,
        [sequenceName],
      );
    }

    console.log("Sequence sync complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Sequence sync failed:", error.message || String(error));
  process.exit(1);
});
