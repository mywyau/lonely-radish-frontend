import { processPendingNotificationEmails } from '~/server/utils/notificationEmail'

export default defineEventHandler(async () => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  return processPendingNotificationEmails()
})
