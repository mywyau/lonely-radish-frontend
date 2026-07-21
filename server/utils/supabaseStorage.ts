import { createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export const PROFILE_PHOTO_BUCKET = 'profile-photos'

export function storageAdmin() {
  const url = process.env.SUPABASE_URL?.trim()
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim()
  if (!url || !key) throw createError({ statusCode: 503, statusMessage: 'Profile photo storage is not configured' })
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function photoOwnerFolder(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export async function signedPhotoUrl(storageKey: string, expiresIn = 3600) {
  const { data, error } = await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET).createSignedUrl(storageKey, expiresIn)
  if (error) throw createError({ statusCode: 502, statusMessage: 'Could not load profile photo' })
  return data.signedUrl
}
