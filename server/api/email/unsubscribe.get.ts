import { getQuery, sendRedirect } from 'h3'
import { db } from '~/server/repositories/db'

export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token || '')
  if (/^[0-9a-f-]{36}$/i.test(token)) await db.query(`update email_notification_preferences
    set interests=false,matches=false,date_plans=false,follow_ups=false,updated_at=now() where unsubscribe_token=$1::uuid`, [token])
  return sendRedirect(event, '/notifications?email=unsubscribed')
})
