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
    const uploadUrl = read('server/api/profile/photos/upload-url.post.ts')
    expect(uploadUrl).toContain('MAX_PHOTO_BYTES = 1024 * 1024')
    expect(uploadUrl).toContain('MAX_THUMBNAIL_BYTES = 200 * 1024')
    expect(uploadUrl).toContain("contentType !== 'image/webp'")
    expect(read('server/api/profile/photos/confirm.post.ts')).toContain('.info(storageKey)')
    expect(read('server/api/profile/photos/confirm.post.ts')).toContain("photo.contentType !== 'image/webp'")
    expect(read('server/api/profile/photos/confirm.post.ts')).toContain('thumbnail_storage_key')
    expect(read('server/api/profile/photos.put.ts')).toContain('Photo list changed; refresh before reordering')
    expect(read('server/api/profile/photos/[id].delete.ts')).toContain('thumbnail_storage_key')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('signedPhotoUrl')
    const page = read('pages/photos.vue')
    expect(page).toContain('optimizeProfilePhoto')
    expect(page).toContain("cacheControl: '31536000'")
    expect(page).toContain('we’ll optimise it before uploading')
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
    expect(page).not.toContain('Skip for now')
    const profilePage = read('pages/profiles/[slug].vue')
    expect(profilePage).toContain('gallerySlots')
    expect(profilePage).toContain('Empty photo slot')
    expect(profilePage).toContain('profile-photo-empty')
    expect(profilePage.match(/class="contents lg:flex lg:flex-col lg:gap-5"/g)).toHaveLength(2)
    expect(profilePage).not.toContain('lg:space-y-5')
    expect(profilePage).toContain('class="hidden lg:block"')
    expect(profilePage.indexOf('class="hidden lg:block"'))
      .toBeLessThan(profilePage.indexOf('profile-summary-flip order-2'))
    expect(profilePage).toContain('function openPhoto(index: number)')
    expect(profilePage).toContain('@click="!photo.empty && openPhoto(index)"')
    expect(profilePage).toContain('aria-label="Close expanded photo"')
    expect(profilePage).toContain("if (event.key === 'ArrowLeft') changePhoto(-1)")
  })

  it('uses thumbnails in collection views while preserving full profile photos', () => {
    for (const path of [
      'server/api/activities/[slug]/people.get.ts',
      'server/api/blocks/index.get.ts',
      'server/api/interests/received.get.ts',
      'server/api/interests/sent.get.ts',
      'server/api/matches/index.get.ts',
      'server/api/matches/past.get.ts',
    ]) {
      expect(read(path)).toContain('coalesce(thumbnail_storage_key,storage_key)')
    }
    expect(read('server/api/profiles/[slug].get.ts')).not.toContain('coalesce(thumbnail_storage_key,storage_key)')
    expect(read('docs/migrations/20260829_add_profile_photo_thumbnails.sql')).toContain('thumbnail_storage_key')
  })
})
