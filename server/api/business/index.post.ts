import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

const categories = new Set(['cafe','restaurant','bar','activity','culture','wellness','other'])

export default defineEventHandler(async (event) => {
  const { sub, email } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const businessName = text(body.businessName, 'Business name', 120, true)!
  const contactEmail = text(body.contactEmail || email, 'Contact email', 254, true)!
  const venueName = text(body.venueName, 'Venue name', 120, true)!
  const category = text(body.category, 'Venue category', 30, true)!
  const addressLine = text(body.addressLine, 'Venue address', 200, true)!
  const city = text(body.city, 'City', 100, true)!
  const postcode = text(body.postcode, 'Postcode', 16, true)!
  if (businessName.length < 2) throw createError({ statusCode: 400, statusMessage: 'Business name must be at least 2 characters' })
  if (venueName.length < 2) throw createError({ statusCode: 400, statusMessage: 'Venue name must be at least 2 characters' })
  if (!categories.has(category)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid venue category' })
  const client = await db.connect()
  try {
    await client.query('begin')
    const account = await client.query('select account_type from users where id=$1 for update', [sub])
    if (account.rows[0]?.account_type !== 'business') {
      throw createError({ statusCode: 409, statusMessage: 'Sign out and create a separate business account to continue' })
    }
    const existing = await client.query('select 1 from business_members where user_id=$1 limit 1', [sub])
    if (existing.rows[0]) throw createError({ statusCode: 409, statusMessage: 'This account already manages a business' })
    const slugBase = businessName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,70) || 'business'
    const slug = `${slugBase}-${crypto.randomUUID().replace(/-/g,'').slice(0,7)}`
    const business = await client.query(`insert into businesses(name,slug,contact_email)
      values($1,$2,$3) returning id,name,slug,status,contact_email as "contactEmail"`, [businessName,slug,contactEmail])
    await client.query(`insert into business_members(business_id,user_id,role) values($1,$2,'owner')`, [business.rows[0].id,sub])
    const venue = await client.query(`insert into business_venues(business_id,name,category,address_line,city,postcode)
      values($1,$2,$3,$4,$5,$6) returning id,name,category,address_line as "addressLine",city,postcode,status`,
    [business.rows[0].id,venueName,category,addressLine,city,postcode.toUpperCase()])
    await client.query('commit')
    return { business: business.rows[0], venue: venue.rows[0] }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string; constraint?: string }).code === '23514') {
      const constraint = (error as { constraint?: string }).constraint
      if (constraint === 'businesses_name_check') throw createError({ statusCode: 400, statusMessage: 'Business name must be between 2 and 120 characters' })
      if (constraint === 'business_venues_name_check') throw createError({ statusCode: 400, statusMessage: 'Venue name must be between 2 and 120 characters' })
    }
    throw error
  } finally { client.release() }
})
