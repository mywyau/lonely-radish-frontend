<script setup lang="ts">
import { Plus, Tag, X } from '@lucide/vue'

definePageMeta({ title: 'Personal Interests · Lonely Radish', middleware: 'logged-in' })

const interests = ref<string[]>([])
const newInterest = ref('')
const limit = ref(5)
const labelLimit = ref(40)
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const errorMessage = ref('')
const limitReached = computed(() => interests.value.length >= limit.value)

function addInterest() {
  const interest = newInterest.value.trim().replace(/\s+/g, ' ')
  errorMessage.value = ''
  if (!interest) return
  if (interest.length > labelLimit.value) {
    errorMessage.value = `Keep each interest to ${labelLimit.value} characters or less.`
    return
  }
  if (interests.value.some(item => item.toLocaleLowerCase() === interest.toLocaleLowerCase())) {
    errorMessage.value = 'You have already added that interest.'
    return
  }
  if (limitReached.value) {
    errorMessage.value = `You can add up to ${limit.value} personal interests.`
    return
  }
  interests.value.push(interest)
  newInterest.value = ''
  saved.value = false
}

function removeInterest(interest: string) {
  interests.value = interests.value.filter(item => item !== interest)
  saved.value = false
  errorMessage.value = ''
}

async function save() {
  saving.value = true
  saved.value = false
  errorMessage.value = ''
  try {
    const response = await $fetch<{ interests: string[]; limit: number; labelLimit: number }>('/api/preferences/interests', {
      method: 'PUT', body: { interests: interests.value },
    })
    interests.value = response.interests
    saved.value = true
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Your personal interests could not be saved.'
  } finally { saving.value = false }
}

onMounted(async () => {
  try {
    const response = await $fetch<{ interests: string[]; limit: number; labelLimit: number }>('/api/preferences/interests')
    interests.value = response.interests
    limit.value = response.limit
    labelLimit.value = response.labelLimit
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Your personal interests could not be loaded.'
  } finally { loading.value = false }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your profile</p>
      <h1 class="mt-2 text-4xl font-semibold">Personal interests</h1>
      <p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">Add up to five things that say something about you. These can be anything—from pottery and sci-fi novels to Sunday roasts or collecting vinyl.</p>

      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]">Loading your interests…</div>
      <form v-else class="mt-8 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-7" @submit.prevent="save">
        <div class="flex items-start gap-3">
          <Tag class="mt-1 size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
          <div><h2 class="text-xl font-semibold">What are you into?</h2><p class="mt-1 text-sm leading-6 text-[#6E4D58]">Write your own short interests. They appear on your profile but do not change your matching filters.</p></div>
        </div>

        <div v-if="interests.length" class="mt-6 flex flex-wrap gap-2" aria-label="Your personal interests">
          <span v-for="interest in interests" :key="interest" class="inline-flex items-center overflow-hidden rounded-full bg-[#F3E8DA] text-sm font-semibold text-[#4D2F39]">
            <span class="px-3 py-2">{{ interest }}</span>
            <button type="button" class="border-l border-[#D8C8B6] px-2.5 py-2 transition hover:bg-[#FCE3E8]" :aria-label="`Remove ${interest}`" @click="removeInterest(interest)"><X class="size-3.5" /></button>
          </span>
        </div>
        <p v-else class="mt-6 rounded-lg bg-[#FBF7F1] p-4 text-sm text-[#6E4D58]">You have not added any personal interests yet.</p>

        <label class="mt-6 block text-sm font-semibold" for="new-personal-interest">Add an interest <span class="font-normal text-[#6E4D58]">({{ interests.length }}/{{ limit }})</span></label>
        <div class="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="new-personal-interest" v-model="newInterest" :maxlength="labelLimit" :disabled="limitReached" class="min-w-0 flex-1 rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] px-4 py-3 outline-none focus:border-[#B4234A] focus:ring-2 focus:ring-[#F7B7C4] disabled:cursor-not-allowed disabled:opacity-60" placeholder="For example, restoring old furniture" @keydown.enter.prevent="addInterest">
          <button type="button" :disabled="limitReached || !newInterest.trim()" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4D2F39] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" @click="addInterest"><Plus class="size-4" />Add</button>
        </div>
        <p class="mt-2 text-right text-xs text-[#6E4D58]">{{ newInterest.length }}/{{ labelLimit }}</p>
        <p v-if="limitReached" class="mt-2 text-sm font-semibold text-[#8F1839]">You have added the maximum of {{ limit }} interests.</p>
        <p v-if="errorMessage" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>

        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" :disabled="saving" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save personal interests' }}</button>
          <NuxtLink to="/preferences" class="px-3 py-2 text-sm font-semibold text-[#8F1839]">Back to preferences</NuxtLink>
          <span v-if="saved" class="text-sm font-semibold text-[#52713A]" role="status">Personal interests saved.</span>
        </div>
      </form>
    </section>
  </main>
</template>
