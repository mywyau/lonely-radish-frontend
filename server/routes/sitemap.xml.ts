export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

  const routes = [
    { path: '/', changeFrequency: 'weekly', priority: '1.0' },
    { path: '/faq', changeFrequency: 'monthly', priority: '0.8' },
    { path: '/upgrade', changeFrequency: 'monthly', priority: '0.7' },
    { path: '/contact', changeFrequency: 'yearly', priority: '0.5' },
    { path: '/terms-of-service', changeFrequency: 'yearly', priority: '0.4' },
    { path: '/acceptable-use', changeFrequency: 'yearly', priority: '0.4' },
    { path: '/law-enforcement-guidelines', changeFrequency: 'yearly', priority: '0.3' },
    { path: '/privacy-notice', changeFrequency: 'yearly', priority: '0.4' },
    { path: '/refund-policy', changeFrequency: 'yearly', priority: '0.4' },
  ]

  const urls = routes
    .map(route => ['<url>', `<loc>${siteUrl}${route.path}</loc>`,
      `<changefreq>${route.changeFrequency}</changefreq>`, `<priority>${route.priority}</priority>`, '</url>'].join(''))
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
