import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = resolve(__dirname, "db-setup.sql");

const require = createRequire(resolve(__dirname, "../lib/db/package.json"));
const pg = require("pg");

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Usage: node apply-db.mjs [DATABASE_URL] or set DATABASE_URL environment variable.");
  process.exit(1);
}

const sql = readFileSync(sqlFile, "utf8");

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log("Connecting to database...");
  await client.connect();
  console.log("Connected! Running db-setup.sql...");
  await client.query(sql);
  console.log("✅ Database setup complete! Tables created and seed data inserted.");

  const result = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'window_door_%'
    ORDER BY table_name
  `);
  console.log("\nTables created:");
  result.rows.forEach((r) => console.log(`  • ${r.table_name}`));

  for (const row of result.rows) {
    const count = await client.query(`SELECT COUNT(*) as cnt FROM "${row.table_name}"`);
    console.log(`    ${row.table_name}: ${count.rows[0].cnt} row(s)`);
  }
} catch (err) {
  console.error("❌ Database setup failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
