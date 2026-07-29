import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

const { Pool } = pg;

export interface DatabaseQueryResult<Row = Record<string, any>> {
  rows: Row[]
  rowCount: number
}

export interface DatabaseQueryable {
  query<Row = Record<string, any>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DatabaseQueryResult<Row>>
}

export interface DatabaseClient extends DatabaseQueryable {
  release(): void
}

export interface Database extends DatabaseQueryable {
  connect(): Promise<DatabaseClient>
}

function createMockDb(): Database {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[db] Missing DATABASE_URL; using mock database responses")
  }

  return {
    async query<Row = Record<string, any>>() {
      return {
        rows: [] as Row[],
        rowCount: 0,
      }
    },
    async connect() {
      return {
        query: async <Row = Record<string, any>>() => ({ rows: [] as Row[], rowCount: 0 }),
        release() {},
      }
    },
  }
}

function postgresQueryable(queryable: pg.Pool | pg.PoolClient): DatabaseQueryable {
  return {
    async query<Row = Record<string, any>>(text: string, values?: readonly unknown[]) {
      const result = await queryable.query(text, values ? [...values] : undefined)
      return {
        rows: result.rows as Row[],
        rowCount: result.rowCount ?? 0,
      }
    },
  }
}

function createPostgresDb(pool: pg.Pool): Database {
  return {
    ...postgresQueryable(pool),
    async connect() {
      const client = await pool.connect()
      return {
        ...postgresQueryable(client),
        release: () => client.release(),
      }
    },
  }
}

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error("[startup] DATABASE_URL is required in production")
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Serverless instances scale horizontally. Keep each local pool small so
      // bursts do not exhaust Supabase's shared transaction-pooler clients.
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
    })
  : null

export const db: Database = pool ? createPostgresDb(pool) : createMockDb()

if (pool) {
  attachDatabasePool(pool)
}
