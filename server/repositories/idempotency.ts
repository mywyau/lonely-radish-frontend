import type { DatabaseClient } from '~/server/repositories/db'

interface IdempotencyRow<Response> {
  requestFingerprint: string
  response: Response | null
}

export type IdempotencyClaim<Response> =
  | { claimed: true }
  | { claimed: false; requestFingerprint: string; response: Response | null }

export class IdempotencyRepository {
  constructor(private readonly client: DatabaseClient) {}

  async removeExpired(userId: string) {
    await this.client.query(`delete from api_idempotency
      where user_id=$1 and created_at<now()-interval '7 days'`, [userId])
  }

  async claim<Response>(
    userId: string,
    operation: string,
    idempotencyKey: string,
    requestFingerprint: string,
  ): Promise<IdempotencyClaim<Response>> {
    const inserted = await this.client.query(`insert into api_idempotency(
        user_id,operation,idempotency_key,request_fingerprint
      ) values($1,$2,$3,$4)
      on conflict(user_id,operation,idempotency_key) do nothing
      returning idempotency_key`, [userId,operation,idempotencyKey,requestFingerprint])
    if (inserted.rowCount === 1) return { claimed: true }

    const existing = await this.client.query<IdempotencyRow<Response>>(`select
        request_fingerprint as "requestFingerprint",response
      from api_idempotency
      where user_id=$1 and operation=$2 and idempotency_key=$3
      for update`, [userId,operation,idempotencyKey])
    const row = existing.rows[0]
    return {
      claimed: false,
      requestFingerprint: row?.requestFingerprint || '',
      response: row?.response ?? null,
    }
  }

  async complete(
    userId: string,
    operation: string,
    idempotencyKey: string,
    response: unknown,
  ) {
    await this.client.query(`update api_idempotency set response=$4::jsonb
      where user_id=$1 and operation=$2 and idempotency_key=$3`,
    [userId,operation,idempotencyKey,JSON.stringify(response)])
  }
}
