import type { H3Event } from 'h3'
import { createError, useSession } from 'h3'

export type AuthSessionUser = {
  sub: string
  email: string
  emailVerified?: boolean
  name?: string
}

type AuthSessionData = { user?: AuthSessionUser }
type AuthFlowData = { state?: string; nonce?: string; returnTo?: string }

function sessionPassword() {
  const password = process.env.AUTH_SESSION_SECRET || process.env.AUTH0_CLIENT_SECRET
  if (!password || password.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'AUTH_SESSION_SECRET must be at least 32 characters' })
  }
  return password
}

function secureCookies() {
  return process.env.NODE_ENV === 'production' || process.env.SITE_URL?.startsWith('https://') === true
}

export function useAuthSession(event: H3Event) {
  return useSession<AuthSessionData>(event, {
    name: 'lonely-radish-session',
    password: sessionPassword(),
    maxAge: 60 * 60 * 24 * 7,
    sessionHeader: false,
    cookie: { httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/' },
  })
}

export function useAuthFlowSession(event: H3Event) {
  return useSession<AuthFlowData>(event, {
    name: 'lonely-radish-auth-flow',
    password: sessionPassword(),
    maxAge: 60 * 10,
    sessionHeader: false,
    cookie: { httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/' },
  })
}

export function safeReturnTo(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
