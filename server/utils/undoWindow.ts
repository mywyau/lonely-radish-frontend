export const undoWindowSeconds = 30

export function undoUntil(from = new Date()) {
  return new Date(from.getTime() + undoWindowSeconds * 1000).toISOString()
}
