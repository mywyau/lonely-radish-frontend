<script setup lang="ts">
import { Camera, ImagePlus, ShieldCheck, Star, Trash2, UploadCloud } from '@lucide/vue'

definePageMeta({
  title: 'Profile Photos · Lonely Radish',
  middleware: 'logged-in',
})

type PhotoPreview = {
  id: string
  name: string
  size: number
  url: string
}

const fileInput = ref<HTMLInputElement | null>(null)
const photos = ref<PhotoPreview[]>([])
const primaryPhotoId = ref<string | null>(null)
const saved = ref(false)

const photoSlots = computed(() => Math.max(0, 6 - photos.value.length))

function openFilePicker() {
  fileInput.value?.click()
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
    .filter(file => file.type.startsWith('image/'))
    .slice(0, photoSlots.value)

  const nextPhotos = files.map(file => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    url: URL.createObjectURL(file),
  }))

  photos.value.push(...nextPhotos)
  if (!primaryPhotoId.value && photos.value[0]) {
    primaryPhotoId.value = photos.value[0].id
  }

  input.value = ''
}

function removePhoto(photo: PhotoPreview) {
  URL.revokeObjectURL(photo.url)
  photos.value = photos.value.filter(item => item.id !== photo.id)

  if (primaryPhotoId.value === photo.id) {
    primaryPhotoId.value = photos.value[0]?.id ?? null
  }
}

function savePhotos() {
  saved.value = true
  window.setTimeout(() => {
    saved.value = false
  }, 2200)
}

onBeforeUnmount(() => {
  for (const photo of photos.value) {
    URL.revokeObjectURL(photo.url)
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <aside class="space-y-4">
        <div class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)]">
          <Camera class="size-6 text-[#F7B7C4]" aria-hidden="true" />
          <h1 class="mt-4 text-3xl font-semibold">
            Profile photos
          </h1>
          <p class="mt-3 text-sm leading-6 text-white/72">
            Add a few clear photos for your profile.
          </p>
        </div>

        <div class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <ShieldCheck class="size-5 text-[#6E8B52]" aria-hidden="true" />
          <h2 class="mt-3 text-lg font-semibold">
            Photo tips
          </h2>
          <ul class="mt-4 space-y-2 text-sm leading-6 text-[#6E4D58]">
            <li>Use recent photos where your face is visible.</li>
            <li>Mix one close-up with activity or full-body photos.</li>
            <li>Avoid screenshots, heavy filters, or group-only photos.</li>
          </ul>
        </div>
      </aside>

      <div class="space-y-5">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex items-start gap-3">
              <ImagePlus class="mt-1 size-5 text-[#B4234A]" aria-hidden="true" />
              <div>
                <h2 class="text-xl font-semibold">Upload photos</h2>
                <p class="mt-1 text-sm text-[#6E4D58]">
                  Choose up to six images. This is a local preview only until real storage is connected.
                </p>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839]"
              @click="openFilePicker"
            >
              <UploadCloud class="size-4" aria-hidden="true" />
              Add photos
            </button>
          </div>

          <input
            ref="fileInput"
            accept="image/*"
            class="sr-only"
            multiple
            type="file"
            @change="onFilesSelected"
          >

          <div class="mt-6 rounded-lg border border-dashed border-[#D8C8B6] bg-[#FBF7F1] p-6 text-center">
            <p class="text-sm font-semibold text-[#4D2F39]">
              {{ photos.length }} / 6 photos selected
            </p>
            <p class="mt-1 text-sm text-[#6E4D58]">
              {{ photoSlots }} slots remaining
            </p>
          </div>
        </section>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="photo in photos"
            :key="photo.id"
            class="overflow-hidden rounded-lg bg-white shadow-[0_10px_24px_rgba(180,35,74,0.08)]"
          >
            <div class="aspect-[4/5] bg-[#F3E8DA]">
              <img :alt="photo.name" :src="photo.url" class="h-full w-full object-cover">
            </div>

            <div class="space-y-3 p-4">
              <div>
                <p class="truncate text-sm font-semibold">
                  {{ photo.name }}
                </p>
                <p class="mt-1 text-xs text-[#6E4D58]">
                  {{ Math.round(photo.size / 1024) }} KB
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition"
                  :class="primaryPhotoId === photo.id ? 'bg-[#B4234A] text-white' : 'bg-[#F3E8DA] text-[#8F1839] hover:bg-[#FCE3E8]'"
                  @click="primaryPhotoId = photo.id"
                >
                  <Star class="size-3.5" aria-hidden="true" />
                  {{ primaryPhotoId === photo.id ? 'Primary' : 'Make primary' }}
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg bg-[#FCE3E8] px-3 py-2 text-xs font-semibold text-[#8F1839] transition hover:bg-[#F7D4DC]"
                  @click="removePhoto(photo)"
                >
                  <Trash2 class="size-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
          </article>

          <button
            v-if="photoSlots > 0"
            type="button"
            class="flex min-h-[18rem] flex-col items-center justify-center rounded-lg border border-dashed border-[#D8C8B6] bg-white/60 p-6 text-center transition hover:bg-white"
            @click="openFilePicker"
          >
            <ImagePlus class="size-8 text-[#B4234A]" aria-hidden="true" />
            <span class="mt-3 text-sm font-semibold">Add another photo</span>
            <span class="mt-1 text-xs text-[#6E4D58]">Local preview only</span>
          </button>
        </section>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839]"
            @click="savePhotos"
          >
            Save mock photos
          </button>
          <NuxtLink to="/account/v2" class="rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#8F1839] transition hover:bg-[#FCE3E8]">
            Back to account
          </NuxtLink>
          <span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Photos saved locally.</span>
        </div>
      </div>
    </section>
  </main>
</template>
