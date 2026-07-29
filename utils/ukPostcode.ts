export function normalizeUkPostcode(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.length < 5) return value.trim().toUpperCase().replace(/\s+/g, ' ')
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

export function isUkPostcode(value: string) {
  return /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2})$/.test(normalizeUkPostcode(value))
}
