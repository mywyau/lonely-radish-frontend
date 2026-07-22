<script setup lang="ts">
import { ArrowLeft, ArrowRight, Brain, Check, Gamepad2, HeartHandshake, ImagePlus, Sparkles, Trophy, UserRound, UsersRound } from '@lucide/vue'

definePageMeta({ title: 'Set up your profile · Lonely Radish', middleware: 'logged-in' })

const router = useRouter()
const route = useRoute()
const { user, resolve } = useMeStateV2()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const step = ref(1)
const photoCount = ref(0)
const profile = reactive({ firstName: '', lastName: '', displayName: '', genderIdentity: '', raceEthnicity: '', slug: '', dateOfBirth: '', pronouns: '', bio: '' })
const birthDate = reactive({ day: '', month: '', year: '' })
const profileNameStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
let profileNameCheck = 0
const activityGroups = [
  { name: 'Culture', options: ['Gallery walks', 'Museums', 'Theatre', 'Indie films', 'Live music', 'Comedy nights'] },
  { name: 'Food and drink', options: ['Markets', 'Casual food spots', 'Cooking classes', 'Dessert crawl', 'Picnics', 'Supper clubs'] },
  { name: 'Outdoors', options: ['Riverside walks', 'Hikes', 'Parks', 'Cycling', 'Street photography', 'Botanical gardens'] },
  { name: 'Sports', options: ['Park tennis', 'Climbing', 'Running clubs', 'Table tennis', 'Casual football', 'Swimming'] },
  { name: 'Gaming', options: ['Co-op games', 'Puzzle rooms', 'Party games', 'Strategy games', 'Cosy games', 'Board games'] },
  { name: 'Learning', options: ['Workshops', 'Talks', 'Language exchange', 'Bookshops', 'Craft classes', 'Trivia nights'] },
]
type SelectedActivity = { name: string; category: string; custom: boolean }
const selectedActivities = ref<SelectedActivity[]>([])
const customActivityInputs = reactive<Record<string, string>>(Object.fromEntries(activityGroups.map(group => [group.name, ''])))
const activityLimitReached = computed(() => selectedActivities.value.length >= 10)
const preferences = reactive({ distance: 10, minimumAge: 24, maximumAge: 40, timing: [] as string[], publicOnly: true,
  genders: [] as string[], openToEveryone: false, raceEthnicities: [] as string[], noRaceEthnicityPreference: true })
const availabilityDays = reactive([
  { weekday: 0, name: 'Monday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 1, name: 'Tuesday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 2, name: 'Wednesday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 3, name: 'Thursday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 4, name: 'Friday', enabled: false, startTime: '18:00', endTime: '22:00' },
  { weekday: 5, name: 'Saturday', enabled: false, startTime: '10:00', endTime: '18:00' },
  { weekday: 6, name: 'Sunday', enabled: false, startTime: '10:00', endTime: '18:00' },
])
const selectedAvailabilityCount = computed(() => availabilityDays.filter(day => day.enabled).length)
const invalidAvailabilityDay = computed(() => availabilityDays.find(day => day.enabled && day.startTime >= day.endTime))
const genderOptions = ['Women', 'Men', 'Non-binary']
const raceEthnicityOptions = ['Asian', 'Black / African / Caribbean', 'Hispanic / Latino', 'Middle Eastern', 'North African', 'Native / Indigenous', 'Pacific Islander', 'White', 'Multiracial / multi-ethnic']
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const birthYears = Array.from({ length: 83 }, (_, index) => new Date().getFullYear() - 18 - index)
const birthDays = computed(() => {
  const year = Number(birthDate.year) || 2000
  const month = Number(birthDate.month) || 1
  return Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1)
})

function updateDateOfBirth() {
  if (!birthDate.day || !birthDate.month || !birthDate.year) { profile.dateOfBirth = ''; return }
  const maximumDay = birthDays.value.length
  if (Number(birthDate.day) > maximumDay) birthDate.day = String(maximumDay)
  profile.dateOfBirth = `${birthDate.year}-${birthDate.month.padStart(2, '0')}-${birthDate.day.padStart(2, '0')}`
}

async function checkProfileName() {
  const name = profile.displayName.trim()
  const request = ++profileNameCheck
  if (!name) { profileNameStatus.value = 'idle'; return }
  profileNameStatus.value = 'checking'
  try {
    const result = await $fetch<{ available: boolean }>('/api/profile/name-availability', { query: { name } })
    if (request === profileNameCheck) profileNameStatus.value = result.available ? 'available' : 'taken'
  } catch { if (request === profileNameCheck) profileNameStatus.value = 'idle' }
}

function toggle(list: string[], value: string, limit = 10) {
  const index = list.indexOf(value)
  if (index >= 0) list.splice(index, 1)
  else if (list.length < limit) list.push(value)
}
function toggleRaceEthnicity(value: string) {
  preferences.noRaceEthnicityPreference = false
  toggle(preferences.raceEthnicities, value, raceEthnicityOptions.length)
  if (!preferences.raceEthnicities.length) preferences.noRaceEthnicityPreference = true
}
function selectNoRacePreference() {
  preferences.noRaceEthnicityPreference = true
  preferences.raceEthnicities.splice(0)
}
function selectEveryone() {
  preferences.openToEveryone = true
  preferences.genders.splice(0)
}
function toggleGenderPreference(value: string) {
  preferences.openToEveryone = false
  toggle(preferences.genders, value)
}

function activityIsSelected(name: string) {
  return selectedActivities.value.some(activity => activity.name === name)
}
function toggleActivity(name: string, category: string, custom = false) {
  const index = selectedActivities.value.findIndex(activity => activity.name === name)
  if (index >= 0) selectedActivities.value.splice(index, 1)
  else if (!activityLimitReached.value) selectedActivities.value.push({ name, category, custom })
}
function customActivityCount(category: string) {
  return selectedActivities.value.filter(activity => activity.custom && activity.category === category).length
}
function addCustomActivity(category: string) {
  const name = customActivityInputs[category].trim()
  const duplicate = selectedActivities.value.some(activity => activity.name.toLowerCase() === name.toLowerCase())
  if (name && !duplicate && !activityLimitReached.value && customActivityCount(category) < 3) {
    selectedActivities.value.push({ name, category, custom: true })
  }
  customActivityInputs[category] = ''
}

function createProfileSlug() {
  const base = profile.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'member'
  return `${base.slice(0, 70)}-${crypto.randomUUID().replace(/-/g, '').slice(0, 7)}`
}

async function load() {
  await resolve()
  const [status, profileData, activityData, general, dating, schedule] = await Promise.all([
    $fetch<any>('/api/onboarding/status'), $fetch<any>('/api/profile/me'),
    $fetch<any>('/api/preferences/activities'), $fetch<any>('/api/preferences/general'), $fetch<any>('/api/preferences/dating'),
    $fetch<any>('/api/preferences/schedule'),
  ])
  if (status.complete) return router.replace('/')
  step.value = status.nextStep
  photoCount.value = status.photoCount || 0
  profile.firstName = user.value?.firstName || ''
  profile.lastName = user.value?.lastName || ''
  if (profileData.profile) Object.assign(profile, {
    displayName: profileData.profile.displayName || '', slug: profileData.profile.slug || '',
    genderIdentity: profileData.profile.genderIdentity || '', raceEthnicity: profileData.profile.raceEthnicity || '', dateOfBirth: profileData.profile.dateOfBirth?.slice(0, 10) || '', pronouns: profileData.profile.pronouns || '', bio: profileData.profile.bio || '',
  })
  if (profile.dateOfBirth) {
    const [year, month, day] = profile.dateOfBirth.split('-')
    Object.assign(birthDate, { year, month, day })
  }
  selectedActivities.value = activityData.selected
  Object.assign(preferences, general, dating)
  preferences.publicOnly = schedule.publicOnly ?? preferences.publicOnly
  for (const window of schedule.windows || []) {
    const day = availabilityDays.find(item => item.weekday === window.weekday)
    if (day) { day.enabled = true; day.startTime = window.startTime.slice(0, 5); day.endTime = window.endTime.slice(0, 5) }
  }
  loading.value = false
}

async function saveBasics() {
  errorMessage.value = ''
  if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.displayName.trim() || !profile.genderIdentity || !profile.dateOfBirth || !profile.bio.trim()) {
    errorMessage.value = 'Please complete all required fields.'; return
  }
  if (profileNameStatus.value === 'taken') { errorMessage.value = 'That profile name is already in use. Please choose another.'; return }
  saving.value = true
  try {
    const account = await $fetch<any>('/api/account/v2/profile', { method: 'POST', body: { firstName: profile.firstName, lastName: profile.lastName } })
    if (user.value) { user.value.firstName = account.firstName; user.value.lastName = account.lastName }
    profile.slug ||= createProfileSlug()
    await $fetch('/api/profile/me', { method: 'PUT', body: { displayName: profile.displayName, genderIdentity: profile.genderIdentity, raceEthnicity: profile.raceEthnicity || null, slug: profile.slug,
      dateOfBirth: profile.dateOfBirth, pronouns: profile.pronouns, bio: profile.bio, availability: [] } })
    step.value = 2
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save your profile.' }
  finally { saving.value = false }
}

async function saveRacialIdentity() {
  errorMessage.value = ''
  if (!profile.raceEthnicity) { errorMessage.value = 'Choose the option that best describes how you identify.'; return }
  saving.value = true
  try {
    await $fetch('/api/profile/me', { method: 'PUT', body: { displayName: profile.displayName, genderIdentity: profile.genderIdentity,
      raceEthnicity: profile.raceEthnicity, slug: profile.slug, dateOfBirth: profile.dateOfBirth,
      pronouns: profile.pronouns, bio: profile.bio, availability: [] } })
    step.value = 3
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save how you identify.' }
  finally { saving.value = false }
}

async function saveActivities() {
  errorMessage.value = ''
  if (!selectedActivities.value.length) { errorMessage.value = 'Choose at least one activity.'; return }
  saving.value = true
  try { await $fetch('/api/preferences/activities', { method: 'PUT', body: { activities: selectedActivities.value } }); step.value = 4 }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save your activities.' }
  finally { saving.value = false }
}

async function savePreferences() {
  errorMessage.value = ''; saving.value = true
  if (invalidAvailabilityDay.value) {
    errorMessage.value = `${invalidAvailabilityDay.value.name} end time must be after its start time.`
    saving.value = false
    return
  }
  try {
    await Promise.all([
      $fetch('/api/preferences/general', { method: 'PUT', body: { distance: preferences.distance, minimumAge: preferences.minimumAge,
        maximumAge: preferences.maximumAge, timing: preferences.timing, publicOnly: preferences.publicOnly } }),
      $fetch('/api/preferences/schedule', { method: 'PUT', body: { publicOnly: preferences.publicOnly,
        availabilityVisibleBeforeMatch: false, windows: availabilityDays.filter(day => day.enabled)
          .map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })) } }),
    ])
    step.value = 5
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save your preferences.' }
  finally { saving.value = false }
}

async function saveDatingPreferences() {
  errorMessage.value = ''
  if (!preferences.openToEveryone && !preferences.genders.length) { errorMessage.value = 'Choose at least one type of person you are open to meeting.'; return }
  saving.value = true
  try {
    await $fetch('/api/preferences/dating', { method: 'PUT', body: { genders: preferences.genders,
      openToEveryone: preferences.openToEveryone, raceEthnicities: preferences.raceEthnicities,
      noRaceEthnicityPreference: preferences.noRaceEthnicityPreference } })
    step.value = 6
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save who you are open to meeting.' }
  finally { saving.value = false }
}

async function finish() {
  errorMessage.value = ''; saving.value = true
  try {
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
        <span class="shrink-0 rounded-full bg-[#FCE3E8] px-3 py-2 text-sm font-semibold text-[#8F1839]">{{ step }} of 6</span>
      </div>
      <div class="mb-6 grid grid-cols-6 gap-2" aria-label="Onboarding progress"><span v-for="number in 6" :key="number" class="h-2 rounded-full" :class="number <= step ? 'bg-[#B4234A]' : 'bg-[#E8D8C4]'" /></div>
      <p class="mb-6 rounded-lg bg-[#F3E8DA] px-4 py-3 text-sm text-[#4D2F39]">Nothing is set in stone. You can update your profile, activities, preferences and photos later from your account.</p>

      <div v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading your profile…</div>

      <form v-else-if="step === 1" class="onboarding-card" @submit.prevent="saveBasics">
        <div class="step-title"><UserRound class="size-5 text-[#B4234A]" /><div><h2>Profile basics</h2><p>Tell people enough to recognise who they might meet.</p></div></div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label>First name <input v-model="profile.firstName" required autocomplete="given-name" placeholder="Your first name"></label>
          <label>Last name <input v-model="profile.lastName" required autocomplete="family-name" placeholder="Your last name"></label>
          <label class="sm:col-span-2">Profile name <input v-model="profile.displayName" required autocomplete="nickname" placeholder="Name shown to other members" @input="profileNameStatus = 'idle'" @blur="checkProfileName"><span v-if="profileNameStatus === 'checking'" class="field-hint">Checking availability…</span><span v-else-if="profileNameStatus === 'available'" class="field-hint success">Name available</span><span v-else-if="profileNameStatus === 'taken'" class="field-hint error">That name is already in use</span></label>
          <label>How do you identify?<select v-model="profile.genderIdentity" required><option value="" disabled>Select an option</option><option value="man">Man</option><option value="woman">Woman</option><option value="neither">Neither / another identity</option></select></label>
          <label>Pronouns <input v-model="profile.pronouns" autocomplete="off" placeholder="Optional"></label>
          <fieldset class="dob-field sm:col-span-2"><legend>Date of birth</legend><p class="field-hint">You must be 18 or over. This is never shown publicly.</p><div class="dob-grid"><label><span>Day</span><select v-model="birthDate.day" required @change="updateDateOfBirth"><option value="" disabled>Day</option><option v-for="day in birthDays" :key="day" :value="String(day)">{{ day }}</option></select></label><label><span>Month</span><select v-model="birthDate.month" required @change="updateDateOfBirth"><option value="" disabled>Month</option><option v-for="(month, index) in months" :key="month" :value="String(index + 1)">{{ month }}</option></select></label><label><span>Year</span><select v-model="birthDate.year" required @change="updateDateOfBirth"><option value="" disabled>Year</option><option v-for="year in birthYears" :key="year" :value="String(year)">{{ year }}</option></select></label></div></fieldset>
          <label class="sm:col-span-2">Short bio <textarea v-model="profile.bio" required maxlength="1000" rows="5" placeholder="A little about you and the kind of person you would enjoy meeting…" /></label>
        </div>
        <p class="mt-3 text-xs text-[#6E4D58]">Your surname and date of birth are not displayed on your public profile.</p>
        <div class="actions"><button :disabled="saving" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <form v-else-if="step === 2" class="onboarding-card" @submit.prevent="saveRacialIdentity">
        <div class="step-title"><UserRound class="size-5 text-[#B4234A]" /><div><h2>How do you racially or ethnically identify?</h2><p>Choose the single option that best fits. You can change this later from your profile.</p></div></div>
        <fieldset class="meeting-preferences"><legend>Your identity</legend><div class="mt-3 grid gap-2 sm:grid-cols-2"><button v-for="option in raceEthnicityOptions" :key="option" type="button" class="meeting-choice" :class="profile.raceEthnicity === option && 'selected'" :aria-pressed="profile.raceEthnicity === option" @click="profile.raceEthnicity = option"><span class="choice-indicator" aria-hidden="true">{{ profile.raceEthnicity === option ? '✓' : '' }}</span><span>{{ option }}</span></button><button type="button" class="meeting-choice" :class="profile.raceEthnicity === 'Prefer not to say' && 'selected'" :aria-pressed="profile.raceEthnicity === 'Prefer not to say'" @click="profile.raceEthnicity = 'Prefer not to say'"><span class="choice-indicator" aria-hidden="true">{{ profile.raceEthnicity === 'Prefer not to say' ? '✓' : '' }}</span><span>Prefer not to say</span></button></div></fieldset>
        <div class="actions"><button class="secondary" type="button" @click="step = 1"><ArrowLeft class="size-4" />Back</button><button :disabled="saving || !profile.raceEthnicity" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <form v-else-if="step === 3" class="onboarding-card" @submit.prevent="saveActivities">
        <div class="step-title"><Sparkles class="size-5 text-[#B4234A]" /><div><h2>What would you enjoy doing?</h2><p>Choose up to 10 interests. Each choice helps people find you through the broader categories in Discover.</p></div></div>
        <div class="mt-6 space-y-4">
          <section v-for="group in activityGroups" :key="group.name" class="activity-group">
            <div class="flex items-center gap-2"><component :is="group.name === 'Sports' ? Trophy : group.name === 'Gaming' ? Gamepad2 : group.name === 'Learning' ? Brain : Sparkles" class="size-5 text-[#B4234A]" /><h3 class="font-semibold">{{ group.name }}</h3></div>
            <div class="mt-3 flex flex-wrap gap-2"><button v-for="activity in group.options" :key="activity" type="button" class="choice" :class="activityIsSelected(activity) && 'selected'" :aria-pressed="activityIsSelected(activity)" :disabled="activityLimitReached && !activityIsSelected(activity)" @click="toggleActivity(activity, group.name)">{{ activity }}</button></div>
            <div v-if="selectedActivities.some(activity => activity.custom && activity.category === group.name)" class="mt-3 flex flex-wrap gap-2"><button v-for="activity in selectedActivities.filter(activity => activity.custom && activity.category === group.name)" :key="activity.name" type="button" class="custom-choice" :aria-label="`Remove custom activity ${activity.name}`" @click="toggleActivity(activity.name, group.name, true)">{{ activity.name }} ×</button></div>
            <label class="mt-4 block">Add your own {{ group.name.toLowerCase() }} activity <span class="font-normal text-[#6E4D58]">({{ customActivityCount(group.name) }}/3)</span></label>
            <div class="mt-2 flex flex-col gap-2 sm:flex-row"><input v-model="customActivityInputs[group.name]" :disabled="activityLimitReached || customActivityCount(group.name) >= 3" class="min-w-0 flex-1" :placeholder="`Add something to ${group.name}`" @keydown.enter.prevent="addCustomActivity(group.name)"><button type="button" class="add-activity" :disabled="activityLimitReached || customActivityCount(group.name) >= 3 || !customActivityInputs[group.name].trim()" @click="addCustomActivity(group.name)">Add</button></div>
          </section>
        </div>
        <section v-if="selectedActivities.length" class="mt-5 rounded-lg bg-[#FCE3E8] p-4"><h3 class="font-semibold">Your interests ({{ selectedActivities.length }}/10)</h3><p v-if="activityLimitReached" class="mt-1 text-sm font-semibold text-[#8F1839]">You have selected the maximum of 10 interests.</p><div class="mt-3 flex flex-wrap gap-2"><button v-for="activity in selectedActivities" :key="activity.name" type="button" class="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#8F1839]" @click="toggleActivity(activity.name, activity.category, activity.custom)">{{ activity.name }} ×</button></div></section>
        <div class="actions"><button class="secondary" type="button" @click="step = 2"><ArrowLeft class="size-4" />Back</button><button :disabled="saving || !selectedActivities.length" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <form v-else-if="step === 4" class="onboarding-card" @submit.prevent="savePreferences">
        <div class="step-title"><HeartHandshake class="size-5 text-[#B4234A]" /><div><h2>Your match preferences</h2><p>Set a useful starting point. Every setting remains editable later.</p></div></div>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <label>Maximum distance <span class="value">{{ preferences.distance }} km</span><input v-model.number="preferences.distance" type="range" min="1" max="100"></label>
          <div class="grid grid-cols-2 gap-3"><label>Minimum age <input v-model.number="preferences.minimumAge" type="number" min="18" max="100"></label><label>Maximum age <input v-model.number="preferences.maximumAge" type="number" min="18" max="100"></label></div>
        </div>
        <fieldset><legend>Weekly availability</legend><p class="mt-1 text-sm font-normal leading-6 text-[#6E4D58]">Select the days you are generally free, then set the earliest and latest time that usually works. Matches can use this later when suggesting a date.</p><div class="mt-4 grid gap-3"><article v-for="day in availabilityDays" :key="day.weekday" class="availability-day" :class="day.enabled && 'enabled'"><div class="flex items-center justify-between gap-4"><label class="flex items-center gap-3"><input v-model="day.enabled" type="checkbox" class="size-4 accent-[#B4234A]">{{ day.name }}</label><span class="text-xs font-semibold text-[#6E4D58]">{{ day.enabled ? 'Available' : 'Not available' }}</span></div><div v-if="day.enabled" class="mt-4 grid grid-cols-2 gap-3"><label>From<input v-model="day.startTime" required type="time"></label><label>Until<input v-model="day.endTime" required type="time"></label></div></article></div><p class="mt-3 text-sm font-semibold text-[#6E4D58]">{{ selectedAvailabilityCount ? `${selectedAvailabilityCount} ${selectedAvailabilityCount === 1 ? 'day' : 'days'} selected` : 'No regular availability selected yet' }}</p></fieldset>
        <label class="check mt-5"><input v-model="preferences.publicOnly" type="checkbox"> Only suggest public places for first meetings</label>
        <div class="actions"><button class="secondary" type="button" @click="step = 3"><ArrowLeft class="size-4" />Back</button><button :disabled="saving || preferences.minimumAge > preferences.maximumAge || Boolean(invalidAvailabilityDay)" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <form v-else-if="step === 5" class="onboarding-card" @submit.prevent="saveDatingPreferences">
        <div class="step-title"><UsersRound class="size-5 text-[#B4234A]" /><div><h2>Who are you open to meeting?</h2><p>These private preferences shape who appears in your match pool and can be changed later.</p></div></div>
        <fieldset class="meeting-preferences"><legend>Gender preferences</legend><p class="mt-1 text-sm font-normal leading-6 text-[#6E4D58]">Choose everyone, or select one or more types of people you are open to dating.</p><div class="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" class="meeting-choice sm:col-span-2" :class="preferences.openToEveryone && 'selected'" :aria-pressed="preferences.openToEveryone" @click="selectEveryone"><span class="choice-indicator" aria-hidden="true">{{ preferences.openToEveryone ? '✓' : '' }}</span><span>Everyone</span></button><button v-for="option in genderOptions" :key="option" type="button" class="meeting-choice" :class="preferences.genders.includes(option) && 'selected'" :aria-pressed="preferences.genders.includes(option)" @click="toggleGenderPreference(option)"><span class="choice-indicator" aria-hidden="true">{{ preferences.genders.includes(option) ? '✓' : '' }}</span><span>{{ option }}</span></button></div><p class="mt-3 text-xs font-semibold text-[#6E4D58]">{{ preferences.openToEveryone ? 'Everyone selected' : preferences.genders.length ? `${preferences.genders.length} selected` : 'Select at least one option' }}</p></fieldset>
        <fieldset class="meeting-preferences"><legend>Racial and ethnic preferences</legend><p class="mt-1 text-sm font-normal leading-6 text-[#6E4D58]">Optional. Choose communities you are interested in dating, or keep your match pool open.</p><div class="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" class="meeting-choice sm:col-span-2" :class="preferences.noRaceEthnicityPreference && 'selected'" :aria-pressed="preferences.noRaceEthnicityPreference" @click="selectNoRacePreference"><span class="choice-indicator" aria-hidden="true">{{ preferences.noRaceEthnicityPreference ? '✓' : '' }}</span><span>No racial or ethnic preference</span></button><button v-for="option in raceEthnicityOptions" :key="option" type="button" class="meeting-choice" :class="preferences.raceEthnicities.includes(option) && 'selected'" :aria-pressed="preferences.raceEthnicities.includes(option)" @click="toggleRaceEthnicity(option)"><span class="choice-indicator" aria-hidden="true">{{ preferences.raceEthnicities.includes(option) ? '✓' : '' }}</span><span>{{ option }}</span></button></div><p class="mt-3 text-xs leading-5 text-[#6E4D58]">Identity is personal and nuanced. These broad options are matching controls only.</p></fieldset>
        <div class="actions"><button class="secondary" type="button" @click="step = 4"><ArrowLeft class="size-4" />Back</button><button :disabled="saving || (!preferences.openToEveryone && !preferences.genders.length)" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <section v-else class="onboarding-card">
        <div class="step-title"><ImagePlus class="size-5 text-[#B4234A]" /><div><h2>Add a profile photo</h2><p>Add up to six photos now, or skip this step and add them later from Profile photos.</p></div></div>
        <div class="mt-6 rounded-lg bg-[#FBF7F1] p-5 text-sm leading-6 text-[#6E4D58]">
          <p v-if="photoCount">You have {{ photoCount }} {{ photoCount === 1 ? 'photo' : 'photos' }} ready.</p>
          <p v-else>You can upload a JPEG, PNG, or WebP image up to 5 MB, or continue without one for now.</p>
        </div>
        <div class="actions"><button class="secondary" type="button" @click="step = 5"><ArrowLeft class="size-4" />Back</button><NuxtLink to="/photos?onboarding=1" class="secondary"><ImagePlus class="size-4" />{{ photoCount ? 'Manage photos' : 'Upload a photo' }}</NuxtLink><button :disabled="saving" class="primary" type="button" @click="finish"><Check class="size-4" />{{ saving ? 'Finishing…' : photoCount ? 'Finish setup' : 'Skip photos and finish' }}</button></div>
      </section>
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
input:not([type='checkbox']):not([type='range']), textarea, select { margin-top: .4rem; width: 100%; border: 1px solid #E8D8C4; border-radius: .5rem; background: #FBF7F1; padding: .75rem; outline: none; }
input:focus, textarea:focus, select:focus { border-color: #B4234A; box-shadow: 0 0 0 2px #F7B7C4; }
.field-hint { display: block; margin-top: .35rem; color: #6E4D58; font-size: .75rem; font-weight: 500; }
.field-hint.success { color: #52713A; }
.field-hint.error { color: #8F1839; }
.dob-field { margin-top: 0; border: 1px solid #E8D8C4; border-radius: .65rem; background: #FFFDFC; padding: 1rem; }
.dob-field legend { padding: 0 .35rem; }
.dob-grid { display: grid; grid-template-columns: .7fr 1.4fr 1fr; gap: .65rem; margin-top: .7rem; }
.dob-grid label span { font-size: .75rem; color: #6E4D58; }
input[type='range'] { margin-top: .8rem; width: 100%; accent-color: #B4234A; }
.value { float: right; color: #8F1839; }
fieldset { margin-top: 1.5rem; }
.choices { margin-top: .75rem; display: flex; flex-wrap: wrap; gap: .5rem; }
.choice { border-radius: 9999px; background: #FBF7F1; padding: .6rem .85rem; color: #4D2F39; font-size: .875rem; font-weight: 600; }
.choice.selected { background: #B4234A; color: white; }
.choice:disabled { cursor: not-allowed; opacity: .4; }
.activity-group { border: 1px solid #E8D8C4; border-radius: .65rem; background: #FFFDFC; padding: 1rem; }
.custom-choice { border-radius: 9999px; background: #EAF2DE; padding: .6rem .85rem; color: #4D2F39; font-size: .875rem; font-weight: 600; }
.add-activity { min-height: 2.75rem; border-radius: .5rem; background: #4D2F39; padding: 0 1rem; color: white; font-size: .875rem; font-weight: 700; }
.add-activity:disabled { cursor: not-allowed; opacity: .45; }
.availability-day { border: 1px solid #E8D8C4; border-radius: .65rem; background: #FBF7F1; padding: 1rem; }
.availability-day.enabled { border-color: #D7A7B3; background: rgba(252,227,232,.4); }
.meeting-preferences { border: 1px solid #E8D8C4; border-radius: .65rem; background: #FFFDFC; padding: 1rem; }
.meeting-preferences legend { padding: 0 .35rem; font-size: 1rem; color: #2A1520; }
.meeting-choice { display: flex; min-height: 3.25rem; align-items: center; gap: .65rem; border: 1px solid #E8D8C4; border-radius: .6rem; background: #FBF7F1; padding: .75rem; color: #4D2F39; text-align: left; font-size: .875rem; font-weight: 700; }
.meeting-choice.selected { border-color: #B4234A; background: #FCE3E8; color: #8F1839; }
.choice-indicator { display: inline-flex; width: 1.25rem; height: 1.25rem; flex-shrink: 0; align-items: center; justify-content: center; border: 1px solid #D7A7B3; border-radius: 9999px; background: white; font-size: .7rem; }
.meeting-choice.selected .choice-indicator { border-color: #B4234A; background: #B4234A; color: white; }
.check { display: flex; align-items: center; gap: .6rem; font-weight: 600; }
.check input { accent-color: #B4234A; }
.actions { margin-top: 2rem; display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem; }
.primary, .secondary { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .5rem; padding: .75rem 1.1rem; font-size: .875rem; font-weight: 700; }
.primary { margin-left: auto; background: #B4234A; color: white; }
.secondary { background: #F3E8DA; color: #4D2F39; }
.primary:disabled { cursor: not-allowed; opacity: .45; }
@media (min-width: 640px) { .onboarding-card { padding: 2rem; } }
</style>
