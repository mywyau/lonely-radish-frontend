import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const migrationsDir = resolve(process.cwd(), 'docs/migrations')
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1 })
const client = await pool.connect()

try {
  await client.query('select pg_advisory_lock($1)', [7281042026])
  await client.query(`create table if not exists schema_migrations (
    filename text primary key, checksum text not null, applied_at timestamptz not null default now()
  )`)

  const files = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort()
  for (const filename of files) {
    const sql = await readFile(resolve(migrationsDir, filename), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const existing = await client.query('select checksum from schema_migrations where filename = $1', [filename])
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${filename}`)
      continue
    }
    await client.query(sql)
    await client.query('insert into schema_migrations (filename, checksum) values ($1, $2)', [filename, checksum])
    process.stdout.write(`Applied ${filename}\n`)
  }
} finally {
  await client.query('select pg_advisory_unlock($1)', [7281042026]).catch(() => {})
  client.release()
  await pool.end()
}
