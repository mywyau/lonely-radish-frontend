import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const userArgument = process.argv.find(argument => argument.startsWith('--user='))
const userId = userArgument?.slice('--user='.length).trim() || null
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

await client.connect()
try {
  const { rows } = await client.query(
    'select reconcile_pending_interest_counts($1) as "repairedUsers"',
    [userId],
  )
  process.stdout.write(`Reconciled pending-interest capacity for ${rows[0]?.repairedUsers || 0} user(s).\n`)
} finally {
  await client.end()
}
