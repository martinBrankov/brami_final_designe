/**
 * Backup script: exports all public Supabase tables to a local JSON snapshot.
 *
 * Usage:
 *   node scripts/backup-supabase.mjs
 *   node scripts/backup-supabase.mjs --table=products
 *   node scripts/backup-supabase.mjs --out=backups/custom-name.json
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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

function createTimestamp() {
  return new Date().toISOString().replaceAll(":", "-");
}

async function getPublicTables({ supabaseUrl, serviceRoleKey }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/openapi+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load Supabase schema: ${response.status} ${response.statusText}`);
  }

  const schema = await response.json();

  return Object.keys(schema.paths ?? {})
    .filter((path) => path !== "/" && !path.startsWith("/rpc/"))
    .map((path) => path.slice(1))
    .filter(Boolean)
    .sort();
}

async function fetchTableRows(supabase, tableName) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, to);

    if (error) {
      throw new Error(`[${tableName}] ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = readEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const allTables = await getPublicTables({ supabaseUrl, serviceRoleKey });
  const selectedTables = args.table
    ? String(args.table)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : allTables;

  const unknownTables = selectedTables.filter((tableName) => !allTables.includes(tableName));

  if (unknownTables.length) {
    throw new Error(`Unknown tables: ${unknownTables.join(", ")}`);
  }

  const backupDir = resolve(__dirname, "../backups");
  const outputPath = args.out
    ? resolve(__dirname, "..", String(args.out))
    : resolve(backupDir, `supabase-backup-${createTimestamp()}.json`);

  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const startedAt = new Date().toISOString();
  const tableEntries = [];

  for (const tableName of selectedTables) {
    console.log(`Backing up ${tableName}...`);
    const rows = await fetchTableRows(supabase, tableName);
    tableEntries.push({
      table: tableName,
      rowCount: rows.length,
      rows,
    });
  }

  const backupPayload = {
    meta: {
      createdAt: startedAt,
      source: supabaseUrl,
      tableCount: tableEntries.length,
      tables: tableEntries.map((entry) => ({
        table: entry.table,
        rowCount: entry.rowCount,
      })),
    },
    data: Object.fromEntries(
      tableEntries.map((entry) => [entry.table, entry.rows]),
    ),
  };

  writeFileSync(outputPath, `${JSON.stringify(backupPayload, null, 2)}\n`, "utf-8");

  console.log(`Backup complete: ${outputPath}`);
}

main().catch((error) => {
  console.error("Backup failed:", error.message || String(error));
  process.exit(1);
});
