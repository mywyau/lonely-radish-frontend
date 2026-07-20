import { setHeader } from 'h3'
import { useAuthSession } from '~/server/utils/authSession'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await useAuthSession(event)
  return { authenticated: Boolean(session.data.user), user: session.data.user || null }
})
