import { db } from '~/server/repositories/db'

export async function processDateReminders() {
  const client = await db.connect()
  let created = 0
  try {
    await client.query('begin')
    const due = await client.query(`select dp.id as "proposalId",dp.match_id as "matchId",
      dp.inviter_id as "inviterId",dp.invitee_id as "inviteeId",pt.proposed_at as "dateTime",
      reminder.type as "reminderType",reminder.kind
      from date_proposals dp
      join proposal_times pt on pt.id=dp.selected_time_id
      cross join lateral (values
        ('24h','date_reminder_24h',interval '24 hours'),
        ('2h','date_reminder_2h',interval '2 hours')
      ) reminder(type,kind,lead_time)
      where dp.status='accepted' and pt.proposed_at>now()
        and pt.proposed_at<=now()+reminder.lead_time
        and not exists(select 1 from date_reminders dr
          where dr.proposal_id=dp.id and dr.reminder_type=reminder.type)
      order by pt.proposed_at for update of dp skip locked`)
    for (const row of due.rows) {
      const inserted = await client.query(`insert into date_reminders(proposal_id,reminder_type)
        values($1,$2) on conflict do nothing returning proposal_id`, [row.proposalId,row.reminderType])
      if (!inserted.rows[0]) continue
      await client.query(`insert into notifications(recipient_id,match_id,proposal_id,kind) values
        ($1,$3,$4,$5),($2,$3,$4,$5)`, [row.inviterId,row.inviteeId,row.matchId,row.proposalId,row.kind])
      created += 2
    }
    await client.query('commit')
    return { proposals: due.rows.length, notifications: created }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
