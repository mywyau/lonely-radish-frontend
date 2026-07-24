import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const { rows } = await db.query(`select dp.id,pt.proposed_at as "dateTime",
    mine.outcome as "myOutcome",mine.note as "myNote",mine.responded_at as "myRespondedAt",
    c.id as "caseId",c.status as "caseStatus",c.response_deadline as "responseDeadline",
    u.confirmed_no_show_count as "confirmedNoShows",u.discovery_restricted_until as "restrictedUntil",
    (select count(*)::int from date_outcome_responses r where r.user_id=$2 and r.outcome='happened') as "attendedDates"
    from date_proposals dp join proposal_times pt on pt.id=dp.selected_time_id
    join users u on u.id=$2
    left join date_outcome_responses mine on mine.proposal_id=dp.id and mine.user_id=$2
    left join date_no_show_cases c on c.proposal_id=dp.id and c.accused_user_id=$2
    where dp.id=$1 and dp.status='accepted' and ($2=dp.inviter_id or $2=dp.invitee_id)`, [id,sub])
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Confirmed date not found' })
  return { eligible: new Date(row.dateTime) <= new Date(), myOutcome: row.myOutcome, myNote: row.myNote,
    myRespondedAt: row.myRespondedAt, caseAgainstMe: row.caseId ? {
      id: row.caseId, status: row.caseStatus, responseDeadline: row.responseDeadline,
    } : null, reliability: { attendedDates: row.attendedDates, confirmedNoShows: row.confirmedNoShows,
      restrictedUntil: row.restrictedUntil } }
})
