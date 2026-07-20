import { createError } from 'h3'

export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) badRequest('Invalid request body')
  return value as Record<string, unknown>
}

export function text(value: unknown, name: string, max: number, required = false) {
  if (value == null || value === '') {
    if (required) badRequest(`${name} is required`)
    return null
  }
  if (typeof value !== 'string') badRequest(`${name} must be text`)
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (required && !normalized) badRequest(`${name} is required`)
  if (normalized.length > max) badRequest(`${name} must be ${max} characters or less`)
  return normalized || null
}

export function integer(value: unknown, name: string, min: number, max: number) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) badRequest(`${name} must be between ${min} and ${max}`)
  return Number(value)
}

export function boolean(value: unknown, name: string) {
  if (typeof value !== 'boolean') badRequest(`${name} must be true or false`)
  return value
}

export function stringArray(value: unknown, name: string, maxItems: number, maxLength = 100) {
  if (!Array.isArray(value) || value.length > maxItems) badRequest(`${name} must contain at most ${maxItems} choices`)
  const items = value.map(item => text(item, name, maxLength, true) as string)
  if (new Set(items.map(item => item.toLowerCase())).size !== items.length) badRequest(`${name} contains duplicate choices`)
  return items
}

export function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}
