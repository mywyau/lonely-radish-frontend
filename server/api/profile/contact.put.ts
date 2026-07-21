import { createError, readBody, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { boolean, objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const phoneNumber = text(body.phoneNumber, 'Phone number', 30)
  const contactEmail = text(body.contactEmail, 'Contact email', 254)
  const socialHandle = text(body.socialHandle, 'Contact handle', 100)
  const shareWithMatches = boolean(body.shareWithMatches, 'Share with matches')
  if (phoneNumber) {
    const digits = phoneNumber.replace(/\D/g, '')
    if (!/^[+()\d.\s-]+$/.test(phoneNumber) || digits.length < 7 || digits.length > 15)
      throw createError({ statusCode: 400, statusMessage: 'Enter a valid phone number' })
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid contact email' })
  if (shareWithMatches && !phoneNumber && !contactEmail && !socialHandle)
    throw createError({ statusCode: 400, statusMessage: 'Add at least one contact detail before sharing' })
  const { rows } = await db.query(`insert into profile_contact_details
    (user_id,phone_number,contact_email,social_handle,share_with_matches) values ($1,$2,$3,$4,$5)
    on conflict (user_id) do update set phone_number=excluded.phone_number,
      contact_email=excluded.contact_email,social_handle=excluded.social_handle,
      share_with_matches=excluded.share_with_matches
    returning phone_number as "phoneNumber",contact_email as "contactEmail",
      social_handle as "socialHandle",share_with_matches as "shareWithMatches"`,
  [sub,phoneNumber,contactEmail,socialHandle,shareWithMatches])
  return rows[0]
})
