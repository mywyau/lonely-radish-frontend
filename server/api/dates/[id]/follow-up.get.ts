import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const { rows } = await db.query(`select dp.id,p.display_name as "personName",p.slug as "personSlug",
    dp.activity_label as activity,dp.venue,pt.proposed_at as "dateTime",
    mine.meet_again as "myChoice",mine.message as "myMessage",mine.responded_at as "myRespondedAt",
    mine.reconsidered_at as "myReconsideredAt",
    theirs.meet_again as "theirChoice",theirs.message as "theirMessage",theirs.responded_at as "theirRespondedAt"
    from date_proposals dp join proposal_times pt on pt.id=dp.selected_time_id
    join profiles p on p.user_id=case when dp.inviter_id=$2 then dp.invitee_id else dp.inviter_id end
    left join date_follow_ups mine on mine.proposal_id=dp.id and mine.user_id=$2
    left join date_follow_ups theirs on theirs.proposal_id=dp.id and theirs.user_id<>$2
    where dp.id=$1 and dp.status='accepted' and ($2=dp.inviter_id or $2=dp.invitee_id)`, [id,sub])
  const date = rows[0]
  if (!date) throw createError({ statusCode: 404, statusMessage: 'Confirmed date not found' })
  const dateHasPassed = new Date(date.dateTime) <= new Date()
  const bothResponded = Boolean(date.myRespondedAt && date.theirRespondedAt)
  const mutual = bothResponded && date.myChoice === true && date.theirChoice === true
  const closed = bothResponded && !mutual
  return { id: date.id, personName: date.personName, personSlug: date.personSlug, activity: date.activity,
    venue: date.venue, dateTime: date.dateTime, dateHasPassed, myChoice: date.myRespondedAt ? date.myChoice : null,
    myMessage: date.myMessage, myReconsideredAt: date.myReconsideredAt, bothResponded, mutual, closed,
    theirChoice: bothResponded ? date.theirChoice : null,
    theirMessage: bothResponded ? date.theirMessage : null,
    canReconsider: closed && date.myChoice === false && date.theirChoice === true && !date.myReconsideredAt }
})
