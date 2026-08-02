export function qstashDeliveryHeaders() {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  return bypass ? { 'x-vercel-protection-bypass': bypass } : undefined
}
