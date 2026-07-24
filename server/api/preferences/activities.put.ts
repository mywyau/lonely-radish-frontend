import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, objectBody, text } from '~/server/utils/productValidation'
import { getUserEntitlement } from '~/server/utils/getEntitlement'
import { hasPaidAccess } from '~/utils/paidAccess'

const categories = new Set(['Culture','Food and drink','Outdoors','Sports','Gaming','Learning','Wellness','Nightlife','Explore','Community'])

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const selectionLimit = hasPaidAccess(await getUserEntitlement(sub)) ? 10 : 5
  if (!Array.isArray(body.activities) || body.activities.length > selectionLimit) {
    badRequest(`Your plan allows up to ${selectionLimit} activity interests`)
  }
  const requested = body.activities.map((value) => {
    if (typeof value === 'string') return { name: text(value, 'Activity', 100, true)!, category: null }
    const activity = objectBody(value)
    const category = text(activity.category, 'Category', 40)
    if (category && !categories.has(category)) badRequest('Choose a valid activity category')
    return { name: text(activity.name, 'Activity', 100, true)!, category }
  })
  if (new Set(requested.map(item => item.name.toLowerCase())).size !== requested.length) badRequest('Activities contains duplicate choices')
  const client = await db.connect()
  try {
    await client.query('begin')
    const catalog = await client.query(`select id,name,category from activities where lower(name)=any($1::text[]) and is_active=true`, [requested.map(item => item.name.toLowerCase())])
    const byName = new Map(catalog.rows.map(row => [String(row.name).toLowerCase(), row]))
    const normalized = requested.map(item => {
      const known = byName.get(item.name.toLowerCase())
      if (known) return { name: item.name, activityId: known.id, category: known.category, custom: false }
      if (!item.category) badRequest(`Choose a category for ${item.name}`)
      return { name: item.name, activityId: null, category: item.category, custom: true }
    })
    for (const category of categories) {
      if (normalized.filter(item => item.custom && item.category === category).length > 3) badRequest(`Add up to 3 custom activities in ${category}`)
    }
    await client.query('delete from profile_activities where user_id=$1', [sub])
    for (const [index, activity] of normalized.entries()) {
      await client.query(`insert into profile_activities(user_id,activity_id,custom_label,custom_category,position) values($1,$2,$3,$4,$5)`,
        [sub,activity.activityId,activity.custom ? activity.name : null,activity.custom ? activity.category : null,index + 1])
    }
    await client.query('commit')
    return { activities: normalized.map(item => ({ name: item.name, category: item.category, custom: item.custom })), selectionLimit }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23505') throw createError({ statusCode: 409, statusMessage: 'Duplicate activity' })
    throw error
  } finally { client.release() }
})
