import { createError } from 'h3'

type OpenCageResult = {
  confidence?: number
  geometry?: { lat?: number; lng?: number }
  components?: Record<string, string>
}

function postcodeArea(postcode: string) {
  const compact = postcode.toUpperCase().replace(/\s+/g, '')
  return compact.slice(0, Math.max(2, compact.length - 3))
}

export async function geocodePostcode(postcode: string) {
  const apiKey = process.env.OPENCAGE_API_KEY?.trim()
  if (!apiKey) throw createError({ statusCode: 503, statusMessage: 'Location lookup is not configured' })

  const response = await $fetch<{ results?: OpenCageResult[] }>('https://api.opencagedata.com/geocode/v1/json', {
    query: {
      q: `${postcode}, United Kingdom`, key: apiKey, countrycode: 'gb', limit: 1,
      no_annotations: 1, no_record: 1,
    },
  }).catch(() => { throw createError({ statusCode: 502, statusMessage: 'Location lookup is temporarily unavailable' }) })
  const result = response.results?.[0]
  const latitude = result?.geometry?.lat
  const longitude = result?.geometry?.lng
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (result?.confidence ?? 0) < 5) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid UK postcode' })
  }
  const components = result?.components || {}
  const label = components.city || components.town || components.village || components.suburb || components.county || 'United Kingdom'
  return { latitude: Number(latitude), longitude: Number(longitude), postcodeArea: postcodeArea(postcode), label }
}
