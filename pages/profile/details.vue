<script setup lang="ts">
import { ArrowLeft, Eye, Heart, Ruler, UserRound } from '@lucide/vue'

definePageMeta({ title: 'About me & lifestyle · Lonely Radish', middleware: 'logged-in' })

const bioLimit = 1000
const loading = ref(true)
const loadError = ref('')
const bio = ref('')
const bioSaving = ref(false)
const bioSaved = ref(false)
const bioError = ref('')
const lifestyle = reactive<{
  heightCm: number | null
  weightKg: number | null
  drinking: string
  smoking: string
  dailyRhythm: string
}>({ heightCm: null, weightKg: null, drinking: '', smoking: '', dailyRhythm: '' })
const lifestyleSaving = ref(false)
const lifestyleSaved = ref(false)
const lifestyleError = ref('')

async function saveBio() {
  bioSaving.value = true
  bioSaved.value = false
  bioError.value = ''
  try {
    const response = await $fetch<{ bio: string }>('/api/profile/bio', {
      method: 'PUT',
      body: { bio: bio.value },
    })
    bio.value = response.bio
    bioSaved.value = true
  } catch (error: any) {
    bioError.value = error?.data?.statusMessage || 'Your About me section could not be saved.'
  } finally {
    bioSaving.value = false
  }
}

async function saveLifestyle() {
  lifestyleSaving.value = true
  lifestyleSaved.value = false
  lifestyleError.value = ''
  try {
    Object.assign(lifestyle, await $fetch('/api/profile/lifestyle', {
      method: 'PUT',
      body: lifestyle,
    }))
    lifestyleSaved.value = true
  } catch (error: any) {
    lifestyleError.value = error?.data?.statusMessage || 'Your lifestyle details could not be saved.'
  } finally {
    lifestyleSaving.value = false
  }
}

onMounted(async () => {
  try {
    const response = await $fetch<any>('/api/profile/me')
    if (!response.profile) {
      loadError.value = 'Complete your profile basics before adding profile details.'
      return
    }
    bio.value = response.profile.bio || ''
    Object.assign(lifestyle, {
      heightCm: response.profile.heightCm ?? null,
      weightKg: response.profile.weightKg ?? null,
      drinking: response.profile.drinking || '',
      smoking: response.profile.smoking || '',
      dailyRhythm: response.profile.dailyRhythm || '',
    })
  } catch (error: any) {
    loadError.value = error?.data?.statusMessage || 'Your profile details could not be loaded.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <NuxtLink to="/account/v2" class="inline-flex items-center gap-2 text-sm font-semibold text-[#8F1839]">
        <ArrowLeft class="size-4" aria-hidden="true" /> Back to account
      </NuxtLink>

      <div class="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your profile</p>
          <h1 class="mt-2 text-4xl font-semibold">About me & lifestyle</h1>
          <p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">Introduce yourself in your own words and choose the optional details you are comfortable showing on your profile.</p>
        </div>
        <NuxtLink to="/profile/preview" class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#4D2F39] px-4 py-3 text-sm font-semibold text-white">
          <Eye class="size-4" aria-hidden="true" /> Preview profile
        </NuxtLink>
      </div>

      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]">Loading your profile details…</div>
      <div v-else-if="loadError" class="mt-8 rounded-lg bg-[#FCE3E8] p-5 text-sm font-semibold text-[#8F1839]" role="alert">{{ loadError }}</div>

      <div v-else class="mt-8 space-y-6">
        <section class="rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-7">
          <div class="flex items-start gap-3">
            <Heart class="mt-1 size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
            <div>
              <h2 class="text-xl font-semibold">Lifestyle and profile details</h2>
              <p class="mt-1 text-sm leading-6 text-[#6E4D58]">These details are optional and are presented with clear labels on your profile.</p>
            </div>
          </div>

          <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="saveLifestyle">
            <label class="text-sm font-medium">Height <span class="font-normal text-[#6E4D58]">(optional)</span>
              <div class="relative"><input v-model.number="lifestyle.heightCm" class="field pr-20" type="number" min="120" max="230" placeholder="170"><span class="pointer-events-none absolute right-10 top-1/2 mt-1 -translate-y-1/2 text-sm text-[#6E4D58]">cm</span></div>
            </label>
            <label class="text-sm font-medium">Weight <span class="font-normal text-[#6E4D58]">(optional)</span>
              <div class="relative"><input v-model.number="lifestyle.weightKg" class="field pr-20" type="number" min="35" max="300" placeholder="70"><span class="pointer-events-none absolute right-10 top-1/2 mt-1 -translate-y-1/2 text-sm text-[#6E4D58]">kg</span></div>
            </label>
            <label class="text-sm font-medium">Daily rhythm <span class="font-normal text-[#6E4D58]">(optional)</span>
              <select v-model="lifestyle.dailyRhythm" class="field"><option value="">Not set</option><option value="early_bird">Early bird — prefers mornings</option><option value="night_owl">Night owl — prefers evenings</option><option value="flexible">Flexible — mornings or evenings</option></select>
            </label>
            <label class="text-sm font-medium">Drinking <span class="font-normal text-[#6E4D58]">(optional)</span>
              <select v-model="lifestyle.drinking" class="field"><option value="">Not set</option><option value="never">Never</option><option value="socially">Socially</option><option value="regularly">Regularly</option><option value="prefer_not_to_say">Prefer not to say</option></select>
            </label>
            <label class="text-sm font-medium">Smoking <span class="font-normal text-[#6E4D58]">(optional)</span>
              <select v-model="lifestyle.smoking" class="field"><option value="">Not set</option><option value="never">Never</option><option value="socially">Socially</option><option value="regularly">Regularly</option><option value="prefer_not_to_say">Prefer not to say</option></select>
            </label>
            <div class="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
              <button type="submit" :disabled="lifestyleSaving" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{{ lifestyleSaving ? 'Saving…' : 'Save lifestyle details' }}</button>
              <span v-if="lifestyleSaved" class="text-sm font-semibold text-[#52713A]" role="status">Lifestyle details saved.</span>
            </div>
            <p v-if="lifestyleError" class="text-sm font-semibold text-[#8F1839] sm:col-span-2" role="alert">{{ lifestyleError }}</p>
          </form>
        </section>

        <section class="rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-7">
          <div class="flex items-start gap-3">
            <UserRound class="mt-1 size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
            <div>
              <h2 class="text-xl font-semibold">About me</h2>
              <p class="mt-1 text-sm leading-6 text-[#6E4D58]">Share what makes you you, what your life looks like, and the kind of connection you would enjoy.</p>
            </div>
          </div>

          <form class="mt-6" @submit.prevent="saveBio">
            <label for="profile-bio" class="text-sm font-semibold">Your introduction</label>
            <textarea id="profile-bio" v-model="bio" required :maxlength="bioLimit" rows="8" class="field resize-y" placeholder="A little about you and the kind of person you would enjoy meeting…" />
            <div class="mt-2 flex items-start justify-between gap-4">
              <p class="text-xs leading-5 text-[#6E4D58]">This appears in the About me section of your public dating profile.</p>
              <span class="shrink-0 text-xs text-[#6E4D58]">{{ bio.length }}/{{ bioLimit }}</span>
            </div>
            <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" :disabled="bioSaving || !bio.trim()" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{{ bioSaving ? 'Saving…' : 'Save About me' }}</button>
              <span v-if="bioSaved" class="text-sm font-semibold text-[#52713A]" role="status">About me saved.</span>
            </div>
            <p v-if="bioError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ bioError }}</p>
          </form>
        </section>

        <div class="flex items-center gap-2 rounded-lg bg-[#F3E8DA] p-4 text-sm leading-6 text-[#4D2F39]">
          <Ruler class="size-5 shrink-0 text-[#8F1839]" aria-hidden="true" />
          Activity interests and personal interests remain available under Preferences.
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.field {
  margin-top: 0.35rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #E8D8C4;
  background: #FBF7F1;
  padding: 0.7rem 0.85rem;
  font-size: 0.95rem;
  outline: none;
}

.field:focus {
  border-color: #B4234A;
  box-shadow: 0 0 0 3px rgba(180, 35, 74, 0.14);
}
</style>
