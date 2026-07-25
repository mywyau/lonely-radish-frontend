import { setHeader } from 'h3'
import { requireAdmin } from '~/server/utils/requireAdmin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const admin = await requireAdmin(event)
  return { admin: true, email: admin.email }
})
