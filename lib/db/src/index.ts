import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) {
      throw new Error(
        "DATABASE_URL is not set in environment variables. Please add DATABASE_URL in Vercel project settings.",
      );
    }
    _pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
    });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export function getPool() {
  if (!_pool) {
    getDb();
  }
  return _pool!;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    const p = getPool();
    const val = (p as any)[prop];
    return typeof val === "function" ? val.bind(p) : val;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const database = getDb();
    const val = (database as any)[prop];
    return typeof val === "function" ? val.bind(database) : val;
  },
});

export * from "./schema";
