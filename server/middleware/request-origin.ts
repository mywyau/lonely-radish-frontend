import { createError, getHeader, getRequestURL } from 'h3'
import { configuredRequestOrigins, requestOriginAllowed } from '~/server/utils/requestOrigin'

export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)
  const allowed = configuredRequestOrigins()
  if (!allowed.size && import.meta.dev) allowed.add(getRequestURL(event).origin)
  if (!requestOriginAllowed({
    method: event.method,
    pathname: requestUrl.pathname,
    origin: getHeader(event, 'origin'),
    fetchSite: getHeader(event, 'sec-fetch-site'),
    allowedOrigins: allowed,
  })) {
    throw createError({ statusCode: 403, statusMessage: 'Request origin is not allowed' })
  }
})
