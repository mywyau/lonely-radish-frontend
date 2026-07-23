import { db } from '~/server/repositories/db'

const subjects: Record<string, string> = {
  interest_received: 'Someone is interested in meeting you',
  new_match: 'You have a new match',
  proposal_received: 'A new date plan is waiting',
  proposal_updated: 'Your date plan was updated',
  date_confirmed: 'Your date is confirmed',
  proposal_declined: 'An update to your date plan',
  follow_up_ready: 'Your post-date check-in is ready',
  match_ended: 'A match has ended',
  date_follow_up_closed: 'Your post-date check-in is complete',
  date_follow_up_changed: 'A past connection changed their answer',
  match_apology: 'You received a note from a past connection',
}

const preferenceColumn: Record<string, string> = {
  interest_received: 'interests',
  new_match: 'matches',
  match_ended: 'matches',
  match_apology: 'matches',
  proposal_received: 'date_plans',
  proposal_updated: 'date_plans',
  date_confirmed: 'date_plans',
  proposal_declined: 'date_plans',
  follow_up_ready: 'follow_ups',
  date_follow_up_closed: 'follow_ups',
  date_follow_up_changed: 'follow_ups',
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!)
}

function message(kind: string, actorName?: string | null) {
  const actor = actorName || 'Someone'
  const copy: Record<string, string> = {
    interest_received: `${actor} showed interest in meeting you.`,
    new_match: `You and ${actor} matched. You can now start planning something together.`,
    proposal_received: `${actor} sent you a date proposal.`,
    proposal_updated: `${actor} updated your date proposal.`,
    date_confirmed: `${actor} confirmed your date plan.`,
    proposal_declined: `${actor} declined the proposed date plan.`,
    follow_up_ready: `${actor} completed their post-date check-in. Your answer remains private until you respond.`,
    match_ended: `${actor} ended your match.`,
    date_follow_up_closed: 'Your post-date answers were different, so the connection has closed.',
    date_follow_up_changed: `${actor} changed their answer and would like to meet again.`,
    match_apology: `${actor} sent you a note through Past connections.`,
  }
  return copy[kind] || 'You have a new update on Lonely Radish.'
}

function emailDestination(kind: string, baseUrl: string) {
  if (kind === 'interest_received') return `${baseUrl}/interests/received`
  if (kind === 'match_apology') return `${baseUrl}/matches/past`
  if (kind.includes('follow_up')) return `${baseUrl}/matches`
  return `${baseUrl}/matches`
}

function actionLabel(kind: string) {
  if (kind === 'interest_received') return 'View their profile'
  if (kind === 'new_match') return 'View your match'
  if (kind.startsWith('proposal_') || kind === 'date_confirmed') return 'Review the date plan'
  if (kind.includes('follow_up')) return 'View your check-in'
  if (kind === 'match_apology') return 'View past connection'
  return 'View update'
}

function renderEmail(input: {
  recipientName?: string | null
  subject: string
  content: string
  actionUrl: string
  action: string
  unsubscribeUrl: string
}) {
  const name = escapeHtml(input.recipientName || 'there')
  const subject = escapeHtml(input.subject)
  const content = escapeHtml(input.content)
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${subject}</title>
<style>@media only screen and (max-width:620px){.email-shell{width:100%!important}.email-pad{padding-left:24px!important;padding-right:24px!important}.email-card{padding:26px 22px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#FBF7F1;color:#2A1520;font-family:Arial,'Helvetica Neue',sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${content}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FBF7F1">
<tr><td class="email-pad" align="center" style="padding:42px 20px">
  <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:100%">
    <tr><td style="padding:0 4px 22px">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border-radius:50%;background:#B4234A;color:#fff;font-size:20px;font-weight:700">R</td>
        <td style="padding-left:12px;font-size:20px;font-weight:700;letter-spacing:-.3px;color:#2A1520">Lonely Radish</td>
      </tr></table>
    </td></tr>
    <tr><td class="email-card" style="padding:38px 40px;background:#fff;border:1px solid #E8D8C4;border-radius:18px;box-shadow:0 12px 32px rgba(180,35,74,.08)">
      <p style="margin:0 0 13px;color:#B4234A;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">A thoughtful update</p>
      <h1 style="margin:0;color:#2A1520;font-size:28px;line-height:1.2;letter-spacing:-.5px">${subject}</h1>
      <p style="margin:24px 0 0;font-size:16px;line-height:1.65;color:#4D2F39">Hi ${name},</p>
      <p style="margin:10px 0 0;font-size:16px;line-height:1.65;color:#4D2F39">${content}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px"><tr>
        <td style="border-radius:10px;background:#B4234A"><a href="${input.actionUrl}" style="display:inline-block;padding:14px 22px;color:#fff;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(input.action)} &rarr;</a></td>
      </tr></table>
      <div style="margin-top:30px;padding:17px 18px;border-radius:12px;background:#F3E8DA">
        <p style="margin:0;font-size:13px;line-height:1.55;color:#6E4D58"><strong style="color:#4D2F39">Take things at your pace.</strong> Keep first meetings public and only share contact details when you feel comfortable.</p>
      </div>
    </td></tr>
    <tr><td align="center" style="padding:24px 24px 0;color:#7C626B;font-size:12px;line-height:1.6">
      <p style="margin:0">Meet through something you both enjoy.</p>
      <p style="margin:8px 0 0">You received this transactional email because you have a Lonely Radish account.<br><a href="${input.unsubscribeUrl}" style="color:#8F1839;text-decoration:underline">Manage or turn off email notifications</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

export async function processPendingNotificationEmails(limit = 20) {
  const batchSize = Math.max(1, Math.min(100, Math.trunc(limit)))
  const client = await db.connect()
  let rows: any[] = []
  try {
    await client.query('begin')
    const claimed = await client.query(`select ed.id,ed.notification_id as "notificationId",ed.kind,u.email,
      p.display_name as "recipientName",actor.display_name as "actorName",pref.unsubscribe_token as "unsubscribeToken",
      pref.interests,pref.matches,pref.date_plans as "datePlans",pref.follow_ups as "followUps"
      from email_deliveries ed join users u on u.id=ed.recipient_id
      join email_notification_preferences pref on pref.user_id=ed.recipient_id
      left join notifications n on n.id=ed.notification_id
      left join profiles p on p.user_id=ed.recipient_id left join profiles actor on actor.user_id=n.actor_id
      where ((ed.status in ('pending','failed') and ed.next_attempt_at<=now())
        or (ed.status='processing' and ed.locked_at<now()-interval '10 minutes'))
        and ed.attempts<5 order by ed.id for update of ed skip locked limit $1`, [batchSize])
    rows = claimed.rows
    if (rows.length) await client.query(`update email_deliveries set status='processing',attempts=attempts+1,locked_at=now()
      where id=any($1::bigint[])`, [rows.map(row => row.id)])
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) throw new Error('RESEND_API_KEY and EMAIL_FROM are required')
  const baseUrl = (process.env.APP_BASE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  let sent = 0
  let failed = 0
  let skipped = 0
  for (const row of rows) {
    const setting = preferenceColumn[row.kind]
    const enabled = setting === 'interests' ? row.interests : setting === 'matches' ? row.matches
      : setting === 'date_plans' ? row.datePlans : row.followUps
    if (!enabled) {
      await db.query(`update email_deliveries set status='skipped',locked_at=null,last_error='Disabled by recipient' where id=$1`, [row.id])
      skipped++
      continue
    }
    try {
      const content = message(row.kind, row.actorName)
      const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${row.unsubscribeToken}`
      const subject = subjects[row.kind] || 'A new Lonely Radish update'
      const actionUrl = emailDestination(row.kind, baseUrl)
      const action = actionLabel(row.kind)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `notification-${row.notificationId}` },
        body: JSON.stringify({
          from, to: [row.email], reply_to: process.env.EMAIL_REPLY_TO || undefined,
          subject,
          text: `Lonely Radish\n\n${subject}\n\nHi ${row.recipientName || 'there'},\n\n${content}\n\n${action}: ${actionUrl}\n\nTake things at your pace. Keep first meetings public and only share contact details when you feel comfortable.\n\nManage email notifications: ${unsubscribeUrl}`,
          html: renderEmail({ recipientName: row.recipientName, subject, content, actionUrl, action, unsubscribeUrl }),
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
        }),
      })
      const result = await response.json() as { id?: string; message?: string }
      if (!response.ok) throw new Error(result.message || `Resend returned ${response.status}`)
      await db.query(`update email_deliveries set status='sent',provider_id=$2,sent_at=now(),locked_at=null,last_error=null where id=$1`, [row.id,result.id])
      sent++
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 500) : 'Unknown delivery error'
      await db.query(`update email_deliveries set status='failed',locked_at=null,last_error=$2,
        next_attempt_at=now()+(interval '5 minutes'*greatest(1,attempts)) where id=$1`, [row.id,detail])
      failed++
    }
  }
  return { processed: rows.length, sent, failed, skipped }
}
