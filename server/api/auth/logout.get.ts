import { createError, sendRedirect } from 'h3'
import { useAuthSession } from '~/server/utils/authSession'

export default defineEventHandler(async (event) => {
  const domain = process.env.AUTH0_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const clientId = process.env.AUTH0_CLIENT_ID?.trim()
  const siteUrl = process.env.SITE_URL?.trim().replace(/\/$/, '')
  if (!domain || !clientId || !siteUrl) throw createError({ statusCode: 500, statusMessage: 'Auth0 logout is not configured' })
  await (await useAuthSession(event)).clear()
  const url = new URL(`https://${domain}/v2/logout`)
  url.search = new URLSearchParams({ client_id: clientId, returnTo: siteUrl }).toString()
  return sendRedirect(event, url.toString(), 302)
})
