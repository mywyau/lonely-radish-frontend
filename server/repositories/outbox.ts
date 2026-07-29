import type { DatabaseQueryable } from '~/server/repositories/db'

export interface OutboxEventPayload {
  eventType: string
  aggregateType: string
  aggregateId: string
  deduplicationKey: string
  payload: Record<string, unknown>
}

export interface ClaimedOutboxEvent {
  id: number
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: unknown
  attempts: number
}

export class OutboxRepository {
  constructor(private readonly database: DatabaseQueryable) {}

  async publish(event: OutboxEventPayload) {
    const { rows } = await this.database.query<{ id: number }>(`insert into outbox_events(
        event_type,aggregate_type,aggregate_id,deduplication_key,payload
      ) values($1,$2,$3,$4,$5::jsonb)
      on conflict(deduplication_key) do nothing
      returning id`, [
      event.eventType,
      event.aggregateType,
      event.aggregateId,
      event.deduplicationKey,
      JSON.stringify(event.payload),
    ])
    return rows[0] ?? null
  }

  async claimAvailable(limit: number) {
    await this.database.query(`update outbox_events set
        status='dead',locked_at=null,
        last_error=coalesce(last_error,'Worker lease expired after the final attempt')
      where status='processing' and attempts>=5
        and locked_at<now()-interval '10 minutes'`)
    const { rows } = await this.database.query<ClaimedOutboxEvent>(`select
        id,event_type as "eventType",aggregate_type as "aggregateType",
        aggregate_id as "aggregateId",payload,attempts
      from outbox_events
      where (
        (status in ('pending','failed') and available_at<=now())
        or (status='processing' and locked_at<now()-interval '10 minutes')
      ) and attempts<5
      order by available_at,id
      for update skip locked
      limit $1`, [limit])
    if (!rows.length) return []
    await this.database.query(`update outbox_events set
        status='processing',attempts=attempts+1,locked_at=now(),last_error=null
      where id=any($1::bigint[])`, [rows.map(row => row.id)])
    return rows.map(row => ({ ...row, attempts: row.attempts + 1 }))
  }

  async markProcessed(id: number) {
    await this.database.query(`update outbox_events set
      status='processed',processed_at=now(),locked_at=null,last_error=null
      where id=$1`, [id])
  }

  async markFailed(id: number, attempts: number, detail: string) {
    const dead = attempts >= 5
    await this.database.query(`update outbox_events set
        status=$2,locked_at=null,last_error=$3,
        available_at=case when $2='failed'
          then now()+make_interval(
            mins => least(60,power(2,greatest($4-1,0))::int)
          )
          else available_at end
      where id=$1`, [id,dead ? 'dead' : 'failed',detail,attempts])
    return dead
  }

  async removeExpired() {
    await this.database.query(`delete from outbox_events
      where (status='processed' and processed_at<now()-interval '30 days')
        or (status='dead' and created_at<now()-interval '90 days')`)
  }
}
