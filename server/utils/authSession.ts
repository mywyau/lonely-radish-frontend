import type { H3Event } from 'h3'
import { createError, useSession } from 'h3'

export type AuthSessionUser = {
  sub: string
  email: string
  emailVerified?: boolean
  name?: string
  mode?: 'personal' | 'business'
}

type AuthSessionData = { user?: AuthSessionUser }
export type AuthFlowAttempt = {
  state: string
  nonce: string
  returnTo: string
  intent: 'personal' | 'business'
  createdAt: number
}
type AuthFlowData = {
  attempts?: AuthFlowAttempt[]
  // Read old single-attempt cookies during a rolling deployment.
  state?: string
  nonce?: string
  returnTo?: string
  intent?: 'personal' | 'business'
}

const AUTH_FLOW_LIFETIME_MS = 10 * 60 * 1000
const MAX_AUTH_FLOW_ATTEMPTS = 3

export function activeAuthFlowAttempts(data: AuthFlowData, now = Date.now()) {
  if (!Array.isArray(data.attempts)) return []
  return data.attempts.filter(attempt => attempt
    && typeof attempt.state === 'string'
    && typeof attempt.nonce === 'string'
    && typeof attempt.returnTo === 'string'
    && (attempt.intent === 'personal' || attempt.intent === 'business')
    && typeof attempt.createdAt === 'number'
    && attempt.createdAt >= now - AUTH_FLOW_LIFETIME_MS)
    .slice(-MAX_AUTH_FLOW_ATTEMPTS)
}

export function findAuthFlowAttempt(data: AuthFlowData, state: string, now = Date.now()): AuthFlowAttempt | null {
  const current = activeAuthFlowAttempts(data, now).find(attempt => attempt.state === state)
  if (current) return current
  if (data.state === state && data.nonce) return {
    state, nonce: data.nonce, returnTo: safeReturnTo(data.returnTo),
    intent: data.intent === 'business' ? 'business' : 'personal', createdAt: now,
  }
  return null
}

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
    // H3 anchors cookie expiry to the session's original creation time. Keep the
    // container available while each attempt enforces its own ten-minute limit.
    maxAge: 60 * 60 * 24,
    sessionHeader: false,
    cookie: { httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/' },
  })
}

export function safeReturnTo(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (value.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') === '/please-sign-in') return '/'
  return value
}
