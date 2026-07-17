export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

  const routes = [
    '/',
    '/coming-soon',
    '/upgrade',
    '/contact',
    '/terms-of-service',
    '/privacy-notice',
    '/refund-policy',
  ]

  const now = new Date().toISOString()

  const urls = routes
    .map((route) => ['<url>', `<loc>${siteUrl}${route}</loc>`, `<lastmod>${now}</lastmod>`, '</url>'].join(''))
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
