export default defineEventHandler((event) => {
  setHeader(event, "cache-control", "no-store")

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    runtime: process.env.NITRO_PRESET ?? "unknown"
  }
})
