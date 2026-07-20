import { createRemoteJWKSet, jwtVerify } from 'jose'
import { createError, getQuery, sendRedirect } from 'h3'
import { ensureUser } from '~/server/services/auth/ensureUser'
import { useAuthFlowSession, useAuthSession } from '~/server/utils/authSession'

function required(name: 'AUTH0_DOMAIN' | 'AUTH0_CLIENT_ID' | 'AUTH0_CLIENT_SECRET' | 'SITE_URL') {
  const value = process.env[name]?.trim()
  if (!value) throw createError({ statusCode: 500, statusMessage: `${name} is not configured` })
  return value
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const flow = await useAuthFlowSession(event)
  if (query.error) return sendRedirect(event, `/please-sign-in?error=${encodeURIComponent(String(query.error_description || query.error))}`, 302)
  if (typeof query.code !== 'string' || typeof query.state !== 'string' || query.state !== flow.data.state) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid authentication callback state' })
  }

  const domain = required('AUTH0_DOMAIN').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const clientId = required('AUTH0_CLIENT_ID')
  const siteUrl = required('SITE_URL').replace(/\/$/, '')
  const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', client_id: clientId,
      client_secret: required('AUTH0_CLIENT_SECRET'), code: query.code,
      redirect_uri: `${siteUrl}/api/auth/callback` }),
  })
  if (!tokenResponse.ok) throw createError({ statusCode: 502, statusMessage: 'Auth0 token exchange failed' })
  const tokens = await tokenResponse.json() as { id_token?: string }
  if (!tokens.id_token) throw createError({ statusCode: 502, statusMessage: 'Auth0 did not return an ID token' })

  const { payload } = await jwtVerify(tokens.id_token, createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`)), {
    issuer: `https://${domain}/`, audience: clientId,
  })
  if (!flow.data.nonce || payload.nonce !== flow.data.nonce || !payload.sub || typeof payload.email !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Auth0 identity token' })
  }

  await ensureUser(payload.sub, payload.email)
  const session = await useAuthSession(event)
  await session.update({ user: { sub: payload.sub, email: payload.email,
    emailVerified: payload.email_verified === true, name: typeof payload.name === 'string' ? payload.name : undefined } })
  const returnTo = flow.data.returnTo || '/'
  await flow.clear()
  return sendRedirect(event, returnTo, 302)
})
