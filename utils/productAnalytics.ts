import { track } from '@vercel/analytics'

type ProductAnalyticsValue = string | number | boolean | null

export function trackProductEvent(name: string, properties?: Record<string, ProductAnalyticsValue>) {
  if (!import.meta.client) return
  try {
    track(name, properties)
  } catch {
    // Analytics must never interrupt a member journey.
  }
}
