import { randomBytes } from 'node:crypto'
import { createError, getQuery, sendRedirect } from 'h3'
import { safeReturnTo, useAuthFlowSession } from '~/server/utils/authSession'

function required(name: 'AUTH0_DOMAIN' | 'AUTH0_CLIENT_ID' | 'SITE_URL') {
  const value = process.env[name]?.trim()
  if (!value) throw createError({ statusCode: 500, statusMessage: `${name} is not configured` })
  return value
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const domain = required('AUTH0_DOMAIN').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const clientId = required('AUTH0_CLIENT_ID')
  const siteUrl = required('SITE_URL').replace(/\/$/, '')
  const state = randomBytes(32).toString('base64url')
  const nonce = randomBytes(32).toString('base64url')
  const flow = await useAuthFlowSession(event)
  await flow.update({ state, nonce, returnTo: safeReturnTo(query.returnTo) })

  const authorizeUrl = new URL(`https://${domain}/authorize`)
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: `${siteUrl}/api/auth/callback`,
    scope: 'openid profile email', state, nonce,
  }).toString()
  const audience = process.env.AUTH0_AUDIENCE?.trim()
  if (audience && audience !== 'your-auth0-api-identifier') {
    authorizeUrl.searchParams.set('audience', audience)
  }
  if (query.mode === 'signup') {
    authorizeUrl.searchParams.set('screen_hint', 'signup')
    authorizeUrl.searchParams.set('prompt', 'login')
  }
  if (query.mode === 'switch') authorizeUrl.searchParams.set('prompt', 'select_account')
  return sendRedirect(event, authorizeUrl.toString(), 302)
})
