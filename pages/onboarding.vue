<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, HeartHandshake, Sparkles, UserRound } from '@lucide/vue'

definePageMeta({ title: 'Set up your profile · Lonely Radish', middleware: 'logged-in' })

const router = useRouter()
const route = useRoute()
const { user, resolve } = useMeStateV2()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const step = ref(1)
const profile = reactive({ firstName: '', lastName: '', displayName: '', slug: '', dateOfBirth: '', pronouns: '', bio: '' })
const catalog = ref<Array<{ name: string; category: string }>>([])
const selectedActivities = ref<string[]>([])
const preferences = reactive({ distance: 10, minimumAge: 24, maximumAge: 40, timing: [] as string[], publicOnly: true,
  genders: [] as string[], openToEveryone: true, raceEthnicities: [] as string[], noRaceEthnicityPreference: true })
const timingOptions = ['Weekday evenings', 'Friday evenings', 'Weekend mornings', 'Weekend afternoons']
const genderOptions = ['Women', 'Men', 'Non-binary people']

function toggle(list: string[], value: string, limit = 10) {
  const index = list.indexOf(value)
  if (index >= 0) list.splice(index, 1)
  else if (list.length < limit) list.push(value)
}

async function load() {
  await resolve()
  const [status, profileData, activityData, general, dating] = await Promise.all([
    $fetch<any>('/api/onboarding/status'), $fetch<any>('/api/profile/me'),
    $fetch<any>('/api/preferences/activities'), $fetch<any>('/api/preferences/general'), $fetch<any>('/api/preferences/dating'),
  ])
  if (status.complete) return router.replace('/')
  step.value = status.nextStep
  profile.firstName = user.value?.firstName || ''
  profile.lastName = user.value?.lastName || ''
  if (profileData.profile) Object.assign(profile, {
    displayName: profileData.profile.displayName || '', slug: profileData.profile.slug || '',
    dateOfBirth: profileData.profile.dateOfBirth?.slice(0, 10) || '', pronouns: profileData.profile.pronouns || '', bio: profileData.profile.bio || '',
  })
  catalog.value = activityData.catalog
  selectedActivities.value = activityData.selected.map((item: { name: string }) => item.name)
  Object.assign(preferences, general, dating)
  loading.value = false
}

async function saveBasics() {
  errorMessage.value = ''
  if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.displayName.trim() || !profile.slug.trim() || !profile.dateOfBirth || !profile.bio.trim()) {
    errorMessage.value = 'Please complete all required fields.'; return
  }
  saving.value = true
  try {
    const account = await $fetch<any>('/api/account/v2/profile', { method: 'POST', body: { firstName: profile.firstName, lastName: profile.lastName } })
    if (user.value) { user.value.firstName = account.firstName; user.value.lastName = account.lastName }
    await $fetch('/api/profile/me', { method: 'PUT', body: { displayName: profile.displayName, slug: profile.slug,
      dateOfBirth: profile.dateOfBirth, pronouns: profile.pronouns, bio: profile.bio, availability: [] } })
    step.value = 2
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save your profile.' }
  finally { saving.value = false }
}

async function saveActivities() {
  errorMessage.value = ''
  if (!selectedActivities.value.length) { errorMessage.value = 'Choose at least one activity.'; return }
  saving.value = true
  try { await $fetch('/api/preferences/activities', { method: 'PUT', body: { activities: selectedActivities.value } }); step.value = 3 }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save your activities.' }
  finally { saving.value = false }
}

async function finish() {
  errorMessage.value = ''; saving.value = true
  try {
    await Promise.all([
      $fetch('/api/preferences/general', { method: 'PUT', body: { distance: preferences.distance, minimumAge: preferences.minimumAge,
        maximumAge: preferences.maximumAge, timing: preferences.timing, publicOnly: preferences.publicOnly } }),
      $fetch('/api/preferences/dating', { method: 'PUT', body: { genders: preferences.genders,
        openToEveryone: preferences.openToEveryone, raceEthnicities: preferences.raceEthnicities,
        noRaceEthnicityPreference: preferences.noRaceEthnicityPreference } }),
    ])
    await $fetch('/api/onboarding/complete', { method: 'POST' })
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//')
      ? route.query.redirect : '/'
    await router.push(redirect === '/onboarding' ? '/' : redirect)
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not complete onboarding.' }
  finally { saving.value = false }
}

onMounted(() => { load().catch(() => { errorMessage.value = 'We could not load onboarding. Please refresh and try again.'; loading.value = false }) })
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-8 text-[#2A1520] sm:px-8 sm:py-12">
    <section class="mx-auto max-w-3xl">
      <div class="mb-7 flex items-center justify-between gap-4">
        <div><p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Profile setup</p><h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Let’s make introductions easier.</h1></div>
        <span class="shrink-0 rounded-full bg-[#FCE3E8] px-3 py-2 text-sm font-semibold text-[#8F1839]">{{ step }} of 3</span>
      </div>
      <div class="mb-6 grid grid-cols-3 gap-2" aria-label="Onboarding progress"><span v-for="number in 3" :key="number" class="h-2 rounded-full" :class="number <= step ? 'bg-[#B4234A]' : 'bg-[#E8D8C4]'" /></div>

      <div v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading your profile…</div>

      <form v-else-if="step === 1" class="onboarding-card" @submit.prevent="saveBasics">
        <div class="step-title"><UserRound class="size-5 text-[#B4234A]" /><div><h2>Profile basics</h2><p>Tell people enough to recognise who they might meet.</p></div></div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label>First name <input v-model="profile.firstName" required autocomplete="given-name" placeholder="Your first name"></label>
          <label>Last name <input v-model="profile.lastName" required autocomplete="family-name" placeholder="Your last name"></label>
          <label>Profile name <input v-model="profile.displayName" required placeholder="Name shown to other members"></label>
          <label>Profile URL <input v-model="profile.slug" required pattern="[a-zA-Z0-9 -]+" placeholder="for example, sam-taylor"></label>
          <label>Date of birth <input v-model="profile.dateOfBirth" required type="date"></label>
          <label>Pronouns <input v-model="profile.pronouns" placeholder="Optional"></label>
          <label class="sm:col-span-2">Short bio <textarea v-model="profile.bio" required maxlength="1000" rows="5" placeholder="A little about you and the kind of person you would enjoy meeting…" /></label>
        </div>
        <p class="mt-3 text-xs text-[#6E4D58]">Your surname and date of birth are not displayed on your public profile.</p>
        <div class="actions"><button :disabled="saving" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <form v-else-if="step === 2" class="onboarding-card" @submit.prevent="saveActivities">
        <div class="step-title"><Sparkles class="size-5 text-[#B4234A]" /><div><h2>What would you enjoy doing?</h2><p>Choose between one and ten. You can change these whenever you like.</p></div></div>
        <div class="mt-6 flex flex-wrap gap-2"><button v-for="activity in catalog" :key="activity.name" type="button" class="choice" :class="selectedActivities.includes(activity.name) && 'selected'" :disabled="selectedActivities.length >= 10 && !selectedActivities.includes(activity.name)" @click="toggle(selectedActivities, activity.name)">{{ activity.name }}</button></div>
        <p class="mt-4 text-sm font-semibold text-[#6E4D58]">{{ selectedActivities.length }}/10 selected</p>
        <div class="actions"><button class="secondary" type="button" @click="step = 1"><ArrowLeft class="size-4" />Back</button><button :disabled="saving || !selectedActivities.length" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <form v-else class="onboarding-card" @submit.prevent="finish">
        <div class="step-title"><HeartHandshake class="size-5 text-[#B4234A]" /><div><h2>Your match preferences</h2><p>Set a useful starting point. Every setting remains editable later.</p></div></div>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <label>Maximum distance <span class="value">{{ preferences.distance }} km</span><input v-model.number="preferences.distance" type="range" min="1" max="100"></label>
          <div class="grid grid-cols-2 gap-3"><label>Minimum age <input v-model.number="preferences.minimumAge" type="number" min="18" max="100"></label><label>Maximum age <input v-model.number="preferences.maximumAge" type="number" min="18" max="100"></label></div>
        </div>
        <fieldset><legend>When are you usually free?</legend><div class="choices"><button v-for="option in timingOptions" :key="option" type="button" class="choice" :class="preferences.timing.includes(option) && 'selected'" @click="toggle(preferences.timing, option)">{{ option }}</button></div></fieldset>
        <fieldset><legend>Who are you open to meeting?</legend><label class="check"><input v-model="preferences.openToEveryone" type="checkbox"> I’m open to everyone</label><div v-if="!preferences.openToEveryone" class="choices"><button v-for="option in genderOptions" :key="option" type="button" class="choice" :class="preferences.genders.includes(option) && 'selected'" @click="toggle(preferences.genders, option)">{{ option }}</button></div></fieldset>
        <label class="check mt-5"><input v-model="preferences.publicOnly" type="checkbox"> Only suggest public places for first meetings</label>
        <div class="actions"><button class="secondary" type="button" @click="step = 2"><ArrowLeft class="size-4" />Back</button><button :disabled="saving || preferences.minimumAge > preferences.maximumAge" class="primary" type="submit"><Check class="size-4" />{{ saving ? 'Finishing…' : 'Finish setup' }}</button></div>
      </form>
      <p v-if="errorMessage" class="mt-4 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.onboarding-card { border-radius: .5rem; background: white; padding: 1.5rem; box-shadow: 0 14px 34px rgba(180,35,74,.09); }
.step-title { display: flex; align-items: flex-start; gap: .75rem; }
.step-title h2 { font-size: 1.25rem; font-weight: 650; }
.step-title p { margin-top: .25rem; color: #6E4D58; font-size: .875rem; line-height: 1.5; }
label, legend { color: #4D2F39; font-size: .875rem; font-weight: 600; }
input:not([type='checkbox']):not([type='range']), textarea { margin-top: .4rem; width: 100%; border: 1px solid #E8D8C4; border-radius: .5rem; background: #FBF7F1; padding: .75rem; outline: none; }
input:focus, textarea:focus { border-color: #B4234A; box-shadow: 0 0 0 2px #F7B7C4; }
input[type='range'] { margin-top: .8rem; width: 100%; accent-color: #B4234A; }
.value { float: right; color: #8F1839; }
fieldset { margin-top: 1.5rem; }
.choices { margin-top: .75rem; display: flex; flex-wrap: wrap; gap: .5rem; }
.choice { border-radius: 9999px; background: #FBF7F1; padding: .6rem .85rem; color: #4D2F39; font-size: .875rem; font-weight: 600; }
.choice.selected { background: #B4234A; color: white; }
.choice:disabled { cursor: not-allowed; opacity: .4; }
.check { display: flex; align-items: center; gap: .6rem; font-weight: 600; }
.check input { accent-color: #B4234A; }
.actions { margin-top: 2rem; display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem; }
.primary, .secondary { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .5rem; padding: .75rem 1.1rem; font-size: .875rem; font-weight: 700; }
.primary { margin-left: auto; background: #B4234A; color: white; }
.secondary { background: #F3E8DA; color: #4D2F39; }
.primary:disabled { cursor: not-allowed; opacity: .45; }
@media (min-width: 640px) { .onboarding-card { padding: 2rem; } }
</style>
