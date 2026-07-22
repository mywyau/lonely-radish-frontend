import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('private profile photo storage', () => {
  it('keeps privileged storage access on the server', () => {
    const storage = read('server/utils/supabaseStorage.ts')
    const env = read('.env.example')
    expect(storage).toContain('SUPABASE_SECRET_KEY')
    expect(storage).toContain("PROFILE_PHOTO_BUCKET = 'profile-photos'")
    expect(env).toContain('NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    expect(env).not.toContain('NUXT_PUBLIC_SUPABASE_SECRET_KEY')
  })

  it('validates, verifies, signs, reorders, and deletes uploaded photos', () => {
    expect(read('server/api/profile/photos/upload-url.post.ts')).toContain('5 * 1024 * 1024')
    expect(read('server/api/profile/photos/confirm.post.ts')).toContain('.info(storageKey)')
    expect(read('server/api/profile/photos/confirm.post.ts')).toContain('object.contentType || object.metadata?.mimetype')
    expect(read('server/api/profile/photos.put.ts')).toContain('Photo list changed; refresh before reordering')
    expect(read('server/api/profile/photos/[id].delete.ts')).toContain('.remove([storageKey])')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('signedPhotoUrl')
    const page = read('pages/photos.vue')
    expect(page).toContain('Display position')
    expect(page).toContain('dropPhoto(index, $event)')
    expect(page).toContain('Earlier')
    expect(page).toContain('Later')
    expect(page).toContain('Profile preview')
    expect(page).toContain('Previewing unsaved changes')
    expect(page).toContain("`preview-${photo.id}`")
    expect(page).toContain("isOnboarding && 'onboarding-return'")
    expect(page).toContain('@keyframes onboardingReturnPulse')
    expect(page).toContain('prefers-reduced-motion: reduce')
    expect(page).toContain('Skip for now')
    const profilePage = read('pages/profiles/[slug].vue')
    expect(profilePage).toContain('gallerySlots')
    expect(profilePage).toContain('Empty photo slot')
    expect(profilePage).toContain('profile-photo-empty')
  })
})
