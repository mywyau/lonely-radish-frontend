import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { databasePoolMax } from "./databasePoolConfig";
import { tracePostgresPoolWait, tracePostgresQuery } from "../utils/telemetry";

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
      const result = await tracePostgresQuery(
        text,
        () => queryable.query(text, values ? [...values] : undefined),
      )
      return {
        rows: result.rows as Row[],
        rowCount: result.rowCount ?? 0,
      }
    },
  }
}

function createPostgresDb(pool: pg.Pool): Database {
  return {
    async query<Row = Record<string, any>>(text: string, values?: readonly unknown[]) {
      const client = await tracePostgresPoolWait(() => pool.connect())
      try {
        return await postgresQueryable(client).query<Row>(text, values)
      } finally {
        client.release()
      }
    },
    async connect() {
      const client = await tracePostgresPoolWait(() => pool.connect())
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
      max: databasePoolMax(),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
    })
  : null

export const db: Database = pool ? createPostgresDb(pool) : createMockDb()

/**
 * Run a group of related queries through one checked-out connection.
 *
 * This deliberately does not start a transaction: read-only handlers can keep
 * their queries small and independent without making the pool acquire a new
 * client for every query.
 */
export async function withDatabaseClient<Result>(
  work: (client: DatabaseClient) => Promise<Result>,
  database: Database = db,
): Promise<Result> {
  const client = await database.connect()
  try {
    return await work(client)
  } finally {
    client.release()
  }
}

if (pool) {
  attachDatabasePool(pool)
}
