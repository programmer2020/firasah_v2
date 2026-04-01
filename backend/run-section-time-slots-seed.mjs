/**
 * Runs ../database/seed_section_time_slots_three_classes.sql using DB_* from backend/.env.
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

/** Split on `;` outside single-quoted strings ('' = escaped quote). */
function splitSqlStatements(sql) {
  const out = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") {
      if (inQuote && sql[i + 1] === "'") {
        buf += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      buf += c;
      continue;
    }
    if (!inQuote && c === ";") {
      const s = buf.trim();
      if (s.length) out.push(s);
      buf = "";
      continue;
    }
    buf += c;
  }
  const tail = buf.trim();
  if (tail.length) out.push(tail);
  return out;
}

/** Drop leading full-line SQL comments so chunks like "-- comment\nINSERT ..." still run. */
function stripLeadingLineComments(sql) {
  const lines = sql.split(/\r?\n/);
  while (
    lines.length &&
    (/^\s*--/.test(lines[0]) || lines[0].trim() === "")
  ) {
    lines.shift();
  }
  return lines.join("\n").trim();
}

const host = process.env.DB_HOST || process.env.LOCAL_DB_HOST;
const port = parseInt(process.env.DB_PORT || process.env.LOCAL_DB_PORT || "5432", 10);
const user = process.env.DB_USER || process.env.LOCAL_DB_USER;
const password = process.env.DB_PASSWORD ?? process.env.LOCAL_DB_PASSWORD ?? "";
const database = process.env.DB_NAME || process.env.LOCAL_DB_NAME;
const useSsl = process.env.DB_SSL === "true";

if (!host || !user || !database) {
  console.error("Missing DB_HOST / DB_USER / DB_NAME in backend/.env");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "database", "seed_section_time_slots_three_classes.sql");
const sql = fs.readFileSync(sqlPath, "utf8");
const statements = splitSqlStatements(sql);

const client = new pg.Client({
  host,
  port,
  user,
  password,
  database,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
try {
  for (const st of statements) {
    const text = stripLeadingLineComments(st);
    if (!text) continue;
    await client.query(text);
  }
  console.log("OK: applied seed_section_time_slots_three_classes.sql (" + statements.length + " statements)");
} finally {
  await client.end();
}
