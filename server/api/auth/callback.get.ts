import { createRemoteJWKSet, jwtVerify } from 'jose'
import { createError, getQuery, sendRedirect } from 'h3'
import { ensureUser } from '~/server/services/auth/ensureUser'
import { accountCollisionMessage, isUniqueConstraintViolation, normalizeAuthEmail } from '~/server/services/auth/accountCollision'
import { db } from '~/server/repositories/db'
import { activeAuthFlowAttempts, findAuthFlowAttempt, safeReturnTo, useAuthFlowSession, useAuthSession } from '~/server/utils/authSession'

function required(name: 'AUTH0_DOMAIN' | 'AUTH0_CLIENT_ID' | 'AUTH0_CLIENT_SECRET' | 'SITE_URL') {
  const value = process.env[name]?.trim()
  if (!value) throw createError({ statusCode: 500, statusMessage: `${name} is not configured` })
  return value
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const flow = await useAuthFlowSession(event)
  const queryState = typeof query.state === 'string' ? query.state : ''
  const attempt = findAuthFlowAttempt(flow.data, queryState)
  const returnTo = attempt?.returnTo || '/'
  const errorPage = attempt?.intent === 'business' ? '/business/sign-in' : '/please-sign-in'
  const consumeAttempt = async () => {
    const attempts = activeAuthFlowAttempts(flow.data).filter(candidate => candidate.state !== queryState)
    await flow.update({ attempts, state: undefined, nonce: undefined, returnTo: undefined, intent: undefined })
  }
  const redirectWithError = async (message: string, consume = true) => {
    if (consume && attempt) await consumeAttempt()
    const params = new URLSearchParams({ error: message, redirect: safeReturnTo(returnTo) })
    return sendRedirect(event, `${errorPage}?${params.toString()}`, 302)
  }
  if (query.error) {
    return redirectWithError(String(query.error_description || query.error))
  }
  if (typeof query.code !== 'string' || !attempt) {
    return redirectWithError('This sign-in attempt expired or was replaced. Please try again in one browser tab.', false)
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
  if (payload.nonce !== attempt.nonce || !payload.sub || typeof payload.email !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Auth0 identity token' })
  }

  const email = normalizeAuthEmail(payload.email)
  if (payload.email_verified !== true) {
    return redirectWithError('This email/password account hasn’t been verified. Check your inbox, or choose “Use another account” to use your original sign-in method.')
  }

  const accountWithEmail = await db.query<{ id: string }>(
    'select id from users where lower(email)=lower($1) limit 1',
    [email],
  )
  if (accountWithEmail.rows[0] && accountWithEmail.rows[0].id !== payload.sub) {
    return redirectWithError(accountCollisionMessage(accountWithEmail.rows[0].id))
  }

  const existing = await db.query(`select u.account_type,u.onboarding_completed_at,
    exists(select 1 from profiles p where p.user_id=u.id) as "hasProfile" from users u where u.id=$1`, [payload.sub])
  try {
    await ensureUser(payload.sub, email)
  } catch (error) {
    // The unique email index remains the final guard if two first logins race.
    if (!isUniqueConstraintViolation(error)) throw error
    const conflictingAccount = await db.query<{ id: string }>(
      'select id from users where lower(email)=lower($1) limit 1',
      [email],
    )
    if (!conflictingAccount.rows[0] || conflictingAccount.rows[0].id === payload.sub) throw error
    return redirectWithError(accountCollisionMessage(conflictingAccount.rows[0].id))
  }
  if (attempt.intent === 'business' && (!existing.rows[0] ||
    (existing.rows[0].account_type === 'personal' && !existing.rows[0].onboarding_completed_at && !existing.rows[0].hasProfile))) {
    await db.query(`update users set account_type='business' where id=$1`, [payload.sub])
  }
  const session = await useAuthSession(event)
  await session.update({ user: { sub: payload.sub, email,
    emailVerified: payload.email_verified === true, name: typeof payload.name === 'string' ? payload.name : undefined,
    mode: attempt.intent === 'business' ? 'business' : 'personal' } })
  const onboarding = await db.query('select onboarding_completed_at,account_type from users where id=$1', [payload.sub])
  await consumeAttempt()
  if (onboarding.rows[0]?.account_type === 'business') {
    return sendRedirect(event, returnTo.startsWith('/business') ? returnTo : '/business', 302)
  }
  if (!onboarding.rows[0]?.onboarding_completed_at) {
    return sendRedirect(event, `/onboarding?redirect=${encodeURIComponent(returnTo)}`, 302)
  }
  return sendRedirect(event, returnTo, 302)
})
