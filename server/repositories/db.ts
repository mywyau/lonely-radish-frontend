import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

const { Pool } = pg;

function createMockDb() {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[db] Missing DATABASE_URL; using mock database responses")
  }

  return {
    async query<T = Record<string, unknown>>() {
      return {
        rows: [] as T[],
        rowCount: 0,
      }
    },
    async connect() {
      return {
        query: async <T = Record<string, unknown>>() => ({ rows: [] as T[], rowCount: 0 }),
        release() {},
      }
    },
  }
}

export const db = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 8,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
    })
  : createMockDb()

if (process.env.DATABASE_URL) {
  attachDatabasePool(db as pg.Pool)
}
