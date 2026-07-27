import { badRequest } from '~/server/utils/productValidation'

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

export async function ensureTimesFitAvailability(queryable: Queryable, userId: string, times: Date[]) {
  const { rows } = await queryable.query(`select
    exists(select 1 from availability where user_id=$1 and weekday is not null
      and start_time is not null and end_time is not null) as "hasAvailability",
    bool_and(exists(select 1 from availability a where a.user_id=$1 and a.weekday is not null
      and a.start_time is not null and a.end_time is not null
      and a.weekday=extract(isodow from (chosen.proposed_at at time zone coalesce(u.timezone,'UTC')))::int-1
      and (chosen.proposed_at at time zone coalesce(u.timezone,'UTC'))::time>=a.start_time
      and a.end_time-(chosen.proposed_at at time zone coalesce(u.timezone,'UTC'))::time>=interval '1 hour'
    )) as "allFit"
    from users u cross join unnest($2::timestamptz[]) as chosen(proposed_at)
    where u.id=$1`, [userId, times.map(time => time.toISOString())])
  if (rows[0]?.hasAvailability && !rows[0]?.allFit) {
    badRequest('Choose a time within the other person’s usual availability')
  }
}
