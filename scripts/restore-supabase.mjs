/**
 * Restore script: imports a JSON snapshot created by backup-supabase.mjs.
 *
 * Usage:
 *   node scripts/restore-supabase.mjs --file=backups/supabase-backup-...json --force
 *   node scripts/restore-supabase.mjs --file=backups/supabase-backup-...json --table=products,user_profiles --force
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * This script is destructive for the selected tables.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_CLEAR_ORDER = [
  "related_products",
  "product_comments",
  "product_highlights",
  "product_images",
  "product_audiences",
  "product_categories",
  "products",
  "customer_order_items",
  "customer_orders",
  "user_profiles",
  "seed_products_json",
  "audiences",
  "categories",
];

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

function chunk(array, size) {
  const result = [];

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }

  return result;
}

function getDeleteColumn(rows) {
  const firstRow = rows[0] ?? {};

  if ("id" in firstRow) {
    return "id";
  }

  if ("product_id" in firstRow) {
    return "product_id";
  }

  const [firstKey] = Object.keys(firstRow);

  if (!firstKey) {
    throw new Error("Cannot infer delete column for table with unknown row shape.");
  }

  return firstKey;
}

async function clearTable(supabase, tableName, rows) {
  if (!rows.length) {
    return;
  }

  const deleteColumn = getDeleteColumn(rows);
  const { error } = await supabase.from(tableName).delete().not(deleteColumn, "is", null);

  if (error) {
    throw new Error(`[clear ${tableName}] ${error.message}`);
  }
}

async function insertTableRows(supabase, tableName, rows) {
  if (!rows.length) {
    return;
  }

  for (const rowsChunk of chunk(rows, 500)) {
    const { error } = await supabase.from(tableName).insert(rowsChunk);

    if (error) {
      throw new Error(`[insert ${tableName}] ${error.message}`);
    }
  }
}

async function getTargetSchema({ supabaseUrl, serviceRoleKey }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/openapi+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load target schema: ${response.status} ${response.statusText}`);
  }

  const schema = await response.json();
  const tableColumns = new Map();

  for (const [path, pathDefinition] of Object.entries(schema.paths ?? {})) {
    if (path === "/" || path.startsWith("/rpc/")) {
      continue;
    }

    const tableName = path.slice(1);
    const definitionName =
      pathDefinition?.get?.responses?.["200"]?.schema?.items?.$ref?.split("/").pop() ??
      tableName;
    const properties = schema.definitions?.[definitionName]?.properties ?? {};
    const columns = Object.keys(properties);

    tableColumns.set(tableName, new Set(columns));
  }

  return tableColumns;
}

function normalizeRowsForTargetTable(rows, allowedColumns) {
  if (!allowedColumns?.size) {
    return rows;
  }

  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => allowedColumns.has(key)),
    ),
  );
}

function applyTableSpecificNormalization(tableName, rows, allowedColumns) {
  const normalizedRows = normalizeRowsForTargetTable(rows, allowedColumns);

  if (
    tableName === "product_comments" &&
    allowedColumns?.has("sort_order")
  ) {
    const counters = new Map();

    return normalizedRows.map((row) => {
      const productId = row.product_id;
      const nextSortOrder = counters.get(productId) ?? 0;
      counters.set(productId, nextSortOrder + 1);

      return {
        ...row,
        sort_order:
          Number.isInteger(row.sort_order) ? row.sort_order : nextSortOrder,
      };
    });
  }

  return normalizedRows;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = readEnvFile();
  const target = String(args.target || "prod").toLowerCase();
  const supabaseUrl =
    args.url
      ? String(args.url)
      : target === "dev"
        ? env.DEV_SUPABASE_URL
        : env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    args["service-role-key"]
      ? String(args["service-role-key"])
      : target === "dev"
        ? env.DEV_SUPABASE_SERVICE_ROLE_KEY
        : env.SUPABASE_SERVICE_ROLE_KEY;

  if (!args.file) {
    throw new Error("Missing --file=backups/your-backup.json");
  }

  if (args.force !== "true") {
    throw new Error("Restore is destructive. Re-run with --force");
  }

  if (!supabaseUrl) {
    throw new Error(
      target === "dev"
        ? "Missing DEV_SUPABASE_URL in .env.local"
        : "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      target === "dev"
        ? "Missing DEV_SUPABASE_SERVICE_ROLE_KEY in .env.local"
        : "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const backupPath = resolve(__dirname, "..", String(args.file));

  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const backupPayload = JSON.parse(readFileSync(backupPath, "utf-8"));
  const backupData = backupPayload?.data;

  if (!backupData || typeof backupData !== "object") {
    throw new Error("Invalid backup file format: missing data object.");
  }

  const backupTables = Object.keys(backupData);
  const selectedTables = args.table
    ? String(args.table)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : backupTables;

  const unknownTables = selectedTables.filter((tableName) => !(tableName in backupData));

  if (unknownTables.length) {
    throw new Error(`Selected tables not found in backup: ${unknownTables.join(", ")}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const targetSchema = await getTargetSchema({ supabaseUrl, serviceRoleKey });
  const restorableTables = selectedTables.filter((tableName) => targetSchema.has(tableName));
  const skippedTables = selectedTables.filter((tableName) => !targetSchema.has(tableName));

  if (!restorableTables.length) {
    throw new Error("None of the selected backup tables exist in the target project.");
  }

  if (skippedTables.length) {
    console.warn(`Skipping missing target tables: ${skippedTables.join(", ")}`);
  }

  const clearOrder = DEFAULT_CLEAR_ORDER.filter((tableName) => restorableTables.includes(tableName));
  const insertOrder = [...clearOrder].reverse();
  const remainingTables = restorableTables.filter((tableName) => !clearOrder.includes(tableName));

  clearOrder.push(...remainingTables);
  insertOrder.unshift(...remainingTables);

  console.log(`Restoring from ${backupPath}`);

  for (const tableName of clearOrder) {
    const rows = applyTableSpecificNormalization(
      tableName,
      Array.isArray(backupData[tableName]) ? backupData[tableName] : [],
      targetSchema.get(tableName),
    );
    console.log(`Clearing ${tableName}...`);
    await clearTable(supabase, tableName, rows);
  }

  for (const tableName of insertOrder) {
    const rows = applyTableSpecificNormalization(
      tableName,
      Array.isArray(backupData[tableName]) ? backupData[tableName] : [],
      targetSchema.get(tableName),
    );
    console.log(`Restoring ${tableName} (${rows.length} rows)...`);
    await insertTableRows(supabase, tableName, rows);
  }

  console.log("Restore complete.");
}

main().catch((error) => {
  console.error("Restore failed:", error.message || String(error));
  process.exit(1);
});
