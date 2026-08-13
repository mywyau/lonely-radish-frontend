<script setup lang="ts">
import { ArrowLeft, ArrowRight, Brain, Check, ChevronDown, Compass, Gamepad2, HandHeart, HeartPulse, ImagePlus, MapPin, MoonStar, Sparkles, Trophy, UserRound } from '@lucide/vue'
import { genderIdentityOptions } from '~/utils/genderIdentity'
import { sexualOrientationOptions } from '~/utils/sexualOrientation'
import { trackProductEvent } from '~/utils/productAnalytics'
import { PROFILE_NAME_LIMIT } from '~/utils/profileName'
import type { OnboardingBootstrapResponse, OnboardingSelectedActivity } from '~/types/api/onboarding'

definePageMeta({ title: 'Set up your profile · Lonely Radish', middleware: 'logged-in' })

const router = useRouter()
const route = useRoute()
const { user, resolve, setOnboardingComplete } = useMeStateV2()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const step = ref<1 | 2 | 3>(1)
const photoCount = ref(0)

watch(step, async (currentStep, previousStep) => {
  if (currentStep === previousStep || !import.meta.client) return
  await nextTick()
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
})

const nameLimit = 80
const displayNameLimit = PROFILE_NAME_LIMIT
const pronounsLimit = 40
const bioLimit = 1000
const customActivityLimit = 100
const minimumOnboardingActivities = 3
const onboardingActivityLimit = 3
const profile = reactive({
  firstName: '', lastName: '', displayName: '', genderIdentity: '', sexualOrientation: '', slug: '',
  dateOfBirth: '', pronouns: '', bio: '', raceEthnicity: '', raceEthnicitySelfDescription: '',
  heightCm: null as number | null, weightKg: null as number | null, drinking: '', smoking: '', dailyRhythm: '',
})
const birthDate = reactive({ day: '', month: '', year: '' })
const profileNameStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const onboardingLocation = reactive({ postcode: '', postcodeArea: '', label: '', hasLocation: false })
let profileNameCheck = 0

const activityGroups = [
  { name: 'Culture', options: ['Gallery walks', 'Museums', 'Theatre', 'Indie films', 'Live music', 'Comedy nights'] },
  { name: 'Food and drink', options: ['Markets', 'Casual food spots', 'Cooking classes', 'Dessert crawl', 'Picnics', 'Restaurants'] },
  { name: 'Outdoors', options: ['Riverside walks', 'Hikes', 'Parks', 'Cycling', 'Street photography', 'Botanical gardens'] },
  { name: 'Sports', options: ['Park tennis', 'Climbing', 'Running clubs', 'Table tennis', 'Casual football', 'Swimming'] },
  { name: 'Gaming', options: ['Action & adventure games', 'Role-playing games (RPGs)', 'Shooter games', 'Strategy games', 'Simulation & management games', 'Cosy & indie games'] },
  { name: 'Learning', options: ['Workshops', 'Talks', 'Language exchange', 'Bookshops', 'Craft classes', 'Trivia nights'] },
  { name: 'Wellness', options: ['Yoga', 'Saunas', 'Meditation', 'Spa days', 'Pilates classes', 'Tai chi', 'Sound baths'] },
  { name: 'Nightlife', options: ['Bars', 'Cocktails', 'Live DJs', 'Dancing', 'Late-night food', 'Pub quizzes', 'Evening events'] },
  { name: 'Explore', options: ['Day trips', 'Sightseeing', 'Hidden spots', 'Walking tours', 'Road trips', 'Trying somewhere new'] },
  { name: 'Community', options: ['Volunteering', 'Community events', 'Charity activities', 'Environmental projects', 'Community gardening', 'Local causes'] },
]
const activityGroupIcons: Record<string, any> = { Sports: Trophy, Gaming: Gamepad2, Learning: Brain, Wellness: HeartPulse, Nightlife: MoonStar, Explore: Compass, Community: HandHeart }
type SelectedActivity = OnboardingSelectedActivity
const selectedActivities = ref<SelectedActivity[]>([])
const openActivityGroups = ref<Set<string>>(new Set([activityGroups[0].name]))
const customActivityInputs = reactive<Record<string, string>>(Object.fromEntries(activityGroups.map(group => [group.name, ''])))
const activityLimitReached = computed(() => selectedActivities.value.length >= onboardingActivityLimit)
const activitiesReady = computed(() => selectedActivities.value.length >= minimumOnboardingActivities)
const setupReady = computed(() => activitiesReady.value && photoCount.value >= 1)
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

function activityIsSelected(name: string) {
  return selectedActivities.value.some(activity => activity.name === name)
}
function activityGroupId(name: string) {
  return `onboarding-activity-group-${name.replaceAll(' ', '-').toLowerCase()}`
}
function toggleActivityGroup(name: string) {
  const next = new Set(openActivityGroups.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  openActivityGroups.value = next
}
function selectedActivityCount(category: string) {
  return selectedActivities.value.filter(activity => activity.category === category).length
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
  const bootstrap = await $fetch<OnboardingBootstrapResponse>('/api/onboarding/bootstrap')
  const { status, activities: activityData, location: savedLocation } = bootstrap
  if (status.complete) return router.replace('/')
  step.value = status.nextStep
  photoCount.value = status.photoCount || 0
  profile.firstName = user.value?.firstName || ''
  profile.lastName = user.value?.lastName || ''
  if (bootstrap.profile) Object.assign(profile, {
    displayName: bootstrap.profile.displayName || '', slug: bootstrap.profile.slug || '',
    genderIdentity: bootstrap.profile.genderIdentity || '', sexualOrientation: bootstrap.profile.sexualOrientation || '',
    raceEthnicity: bootstrap.profile.raceEthnicity || '', raceEthnicitySelfDescription: bootstrap.profile.raceEthnicitySelfDescription || '',
    dateOfBirth: bootstrap.profile.dateOfBirth?.slice(0, 10) || '', pronouns: bootstrap.profile.pronouns || '',
    bio: bootstrap.profile.bio || '', heightCm: bootstrap.profile.heightCm || null, weightKg: bootstrap.profile.weightKg || null,
    drinking: bootstrap.profile.drinking || '', smoking: bootstrap.profile.smoking || '', dailyRhythm: bootstrap.profile.dailyRhythm || '',
  })
  if (profile.dateOfBirth) {
    const [year, month, day] = profile.dateOfBirth.split('-')
    Object.assign(birthDate, { year, month, day })
  }
  selectedActivities.value = activityData.selected.slice(0, onboardingActivityLimit)
  const selectedGroups = selectedActivities.value.map(activity => activity.category)
  openActivityGroups.value = new Set(selectedGroups.length ? selectedGroups : [activityGroups[0].name])
  Object.assign(onboardingLocation, savedLocation)
  loading.value = false
}

async function saveBasics() {
  errorMessage.value = ''
  if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.displayName.trim() || !profile.genderIdentity || !profile.sexualOrientation || !profile.dateOfBirth || !profile.bio.trim()) {
    errorMessage.value = 'Please complete all required fields.'; return
  }
  if (profileNameStatus.value === 'taken') { errorMessage.value = 'That profile name is already in use. Please choose another.'; return }
  saving.value = true
  try {
    const account = await $fetch<any>('/api/account/v2/profile', { method: 'POST', body: { firstName: profile.firstName, lastName: profile.lastName } })
    if (user.value) { user.value.firstName = account.firstName; user.value.lastName = account.lastName }
    profile.slug ||= createProfileSlug()
    await $fetch('/api/profile/me', { method: 'PUT', body: {
      displayName: profile.displayName, genderIdentity: profile.genderIdentity, sexualOrientation: profile.sexualOrientation,
      raceEthnicity: profile.raceEthnicity || null, raceEthnicitySelfDescription: profile.raceEthnicitySelfDescription,
      slug: profile.slug, dateOfBirth: profile.dateOfBirth, pronouns: profile.pronouns, bio: profile.bio,
      heightCm: profile.heightCm, weightKg: profile.weightKg, drinking: profile.drinking, smoking: profile.smoking,
      dailyRhythm: profile.dailyRhythm, availability: [],
    } })
    step.value = 2
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save your profile.' }
  finally { saving.value = false }
}

async function saveLocation() {
  errorMessage.value = ''
  if (!onboardingLocation.hasLocation && !onboardingLocation.postcode.trim()) {
    errorMessage.value = 'Add your UK postcode so we can show people nearby.'; return
  }
  saving.value = true
  try {
    if (onboardingLocation.postcode.trim()) {
      Object.assign(onboardingLocation, await $fetch('/api/profile/location', {
        method: 'PUT', body: { postcode: onboardingLocation.postcode },
      }), { postcode: '' })
    }
    step.value = 3
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save that location.' }
  finally { saving.value = false }
}

async function openPhotoSetup() {
  errorMessage.value = ''
  saving.value = true
  try {
    // Persist the member's activity choices before leaving onboarding so the
    // photo round-trip never discards progress made on this final stage.
    await $fetch('/api/preferences/activities', { method: 'PUT', body: { activities: selectedActivities.value } })
    await router.push('/photos?onboarding=1')
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not save your activities.' }
  finally { saving.value = false }
}

async function finish() {
  errorMessage.value = ''
  if (!activitiesReady.value) { errorMessage.value = `Choose ${minimumOnboardingActivities} activities to continue.`; return }
  if (!photoCount.value) { errorMessage.value = 'Add one profile photo before you start discovering people.'; return }
  saving.value = true
  try {
    await $fetch('/api/preferences/activities', { method: 'PUT', body: { activities: selectedActivities.value } })
    await $fetch('/api/onboarding/complete', { method: 'POST' })
    setOnboardingComplete()
    trackProductEvent('Onboarding Completed', { photoCount: photoCount.value, activityCount: selectedActivities.value.length })
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//')
      ? route.query.redirect : '/activities'
    await router.push(redirect === '/onboarding' ? '/activities' : redirect)
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'We could not complete onboarding.' }
  finally { saving.value = false }
}

onMounted(() => { load().catch(() => { errorMessage.value = 'We could not load onboarding. Please refresh and try again.'; loading.value = false }) })
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-8 text-[#2A1520] sm:px-8 sm:py-12">
    <section class="mx-auto max-w-3xl">
      <div class="mb-7 flex items-center justify-between gap-4">
        <div><p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">A quick start</p><h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Create enough of your profile to meet someone.</h1></div>
        <span class="shrink-0 rounded-full bg-[#FCE3E8] px-3 py-2 text-sm font-semibold text-[#8F1839]">{{ step }} of 3</span>
      </div>
      <div class="mb-6 grid grid-cols-3 gap-2" aria-label="Onboarding progress"><span v-for="number in 3" :key="number" class="h-2 rounded-full" :class="number <= step ? 'bg-[#B4234A]' : 'bg-[#E8D8C4]'" /></div>
      <p class="mb-6 rounded-lg bg-[#F3E8DA] px-4 py-3 text-sm leading-6 text-[#4D2F39]">We’ll ask only for what you need to get started. Age, distance, dating, lifestyle and schedule filters remain available later in <strong>Match preferences</strong>.</p>

      <div v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading your profile…</div>

      <form v-else-if="step === 1" class="onboarding-card" @submit.prevent="saveBasics">
        <div class="step-title"><UserRound class="size-5 text-[#B4234A]" /><div><h2>About you</h2><p>Add the essentials people need to know before deciding whether they would like to meet.</p></div></div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label>First name <input v-model="profile.firstName" required :maxlength="nameLimit" autocomplete="given-name" placeholder="Your first name"></label>
          <label>Last name <input v-model="profile.lastName" required :maxlength="nameLimit" autocomplete="family-name" placeholder="Your last name"></label>
          <label class="sm:col-span-2">Profile name <input v-model="profile.displayName" required :maxlength="displayNameLimit" autocomplete="nickname" placeholder="Name shown to other members" @input="profileNameStatus = 'idle'" @blur="checkProfileName"><span v-if="profileNameStatus === 'checking'" class="field-hint">Checking availability…</span><span v-else-if="profileNameStatus === 'available'" class="field-hint success">Name available</span><span v-else-if="profileNameStatus === 'taken'" class="field-hint error">That name is already in use</span><span class="field-hint text-right">{{ profile.displayName.length }}/{{ displayNameLimit }}</span></label>
          <label>How do you identify?<select v-model="profile.genderIdentity" required><option value="" disabled>Select an option</option><option v-for="option in genderIdentityOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          <label>Sexual orientation<select v-model="profile.sexualOrientation" required><option value="" disabled>Select an option</option><option v-for="option in sexualOrientationOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          <label class="sm:col-span-2">Pronouns <span class="font-normal text-[#6E4D58]">(optional)</span><input v-model="profile.pronouns" :maxlength="pronounsLimit" autocomplete="off" placeholder="For example, she/her"></label>
          <fieldset class="dob-field sm:col-span-2"><legend>Date of birth</legend><p class="field-hint">You must be 18 or over. Your birth date is never shown publicly.</p><div class="dob-grid"><label><span>Day</span><select v-model="birthDate.day" required @change="updateDateOfBirth"><option value="" disabled>Day</option><option v-for="day in birthDays" :key="day" :value="String(day)">{{ day }}</option></select></label><label><span>Month</span><select v-model="birthDate.month" required @change="updateDateOfBirth"><option value="" disabled>Month</option><option v-for="(month, index) in months" :key="month" :value="String(index + 1)">{{ month }}</option></select></label><label><span>Year</span><select v-model="birthDate.year" required @change="updateDateOfBirth"><option value="" disabled>Year</option><option v-for="year in birthYears" :key="year" :value="String(year)">{{ year }}</option></select></label></div></fieldset>
          <label class="sm:col-span-2">Short introduction <textarea v-model="profile.bio" required :maxlength="bioLimit" rows="4" placeholder="What are you like, and what would you enjoy doing with someone new?" /><span class="field-hint text-right">{{ profile.bio.length }}/{{ bioLimit }}</span></label>
        </div>
        <p class="mt-3 text-xs text-[#6E4D58]">Your surname and date of birth are not displayed on your public profile.</p>
        <div class="actions"><button :disabled="saving" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <form v-else-if="step === 2" class="onboarding-card" @submit.prevent="saveLocation">
        <div class="step-title"><MapPin class="size-5 text-[#B4234A]" /><div><h2>Where should we look?</h2><p>We use an approximate location to show people nearby. Your full postcode is never stored or displayed.</p></div></div>
        <section class="mt-6 rounded-lg bg-[#FBF7F1] p-5">
          <label>UK postcode <input v-model="onboardingLocation.postcode" maxlength="16" autocomplete="postal-code" :required="!onboardingLocation.hasLocation" :placeholder="onboardingLocation.hasLocation ? 'Enter a new postcode to update it' : 'For example, SW1A 1AA'"></label>
          <p class="mt-2 text-xs font-normal leading-5 text-[#6E4D58]">We retain only an approximate point and postcode area.</p>
          <p v-if="onboardingLocation.hasLocation" class="mt-3 text-sm font-semibold text-[#52713A]">Location set: {{ onboardingLocation.label }} · {{ onboardingLocation.postcodeArea }}</p>
        </section>
        <div class="mt-5 rounded-lg border border-[#E8D8C4] bg-white p-4 text-sm leading-6 text-[#4D2F39]"><strong>Start broad, fine-tune later.</strong> Discovery begins with inclusive defaults. You can change distance, age, gender, orientation and racial or ethnic preferences from Match preferences whenever you are ready.</div>
        <div class="actions"><button class="secondary" type="button" @click="step = 1"><ArrowLeft class="size-4" />Back</button><button :disabled="saving" class="primary" type="submit">{{ saving ? 'Saving…' : 'Continue' }}<ArrowRight class="size-4" /></button></div>
      </form>

      <section v-else class="onboarding-card">
        <div class="step-title"><Sparkles class="size-5 text-[#B4234A]" /><div><h2>What would you enjoy doing together?</h2><p>Choose three genuine date ideas and add one clear profile photo.</p></div></div>

        <section class="mt-5 rounded-lg p-4" :class="activitiesReady ? 'bg-[#EAF2DE]' : 'bg-[#FCE3E8]'">
          <h3 class="font-semibold">Your activities ({{ selectedActivities.length }}/{{ onboardingActivityLimit }})</h3>
          <p class="mt-1 text-sm text-[#4D2F39]">{{ activitiesReady ? 'That gives people an easy place to begin.' : `Choose ${minimumOnboardingActivities - selectedActivities.length} more.` }}</p>
          <div v-if="selectedActivities.length" class="mt-3 flex flex-wrap gap-2"><button v-for="activity in selectedActivities" :key="activity.name" type="button" class="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#8F1839]" @click="toggleActivity(activity.name, activity.category, activity.custom)">{{ activity.name }} ×</button></div>
        </section>

        <div class="mt-6 space-y-3">
          <section v-for="group in activityGroups" :key="group.name" class="activity-group overflow-hidden">
            <h3><button type="button" class="flex w-full items-center gap-3 text-left" :aria-expanded="openActivityGroups.has(group.name)" :aria-controls="activityGroupId(group.name)" @click="toggleActivityGroup(group.name)"><component :is="activityGroupIcons[group.name] || Sparkles" class="size-5 shrink-0 text-[#B4234A]" /><span class="flex-1 font-semibold">{{ group.name }}</span><span v-if="selectedActivityCount(group.name)" class="rounded-full bg-[#FCE3E8] px-2.5 py-1 text-xs font-bold text-[#8F1839]">{{ selectedActivityCount(group.name) }} selected</span><ChevronDown class="size-5 shrink-0 text-[#6E4D58] transition-transform duration-200" :class="openActivityGroups.has(group.name) && 'rotate-180'" /></button></h3>
            <div v-show="openActivityGroups.has(group.name)" :id="activityGroupId(group.name)" class="mt-4 border-t border-[#F3E8DA] pt-4">
              <div class="flex flex-wrap gap-2"><button v-for="activity in group.options" :key="activity" type="button" class="choice" :class="activityIsSelected(activity) && 'selected'" :aria-pressed="activityIsSelected(activity)" :disabled="activityLimitReached && !activityIsSelected(activity)" @click="toggleActivity(activity, group.name)">{{ activity }}</button></div>
              <label class="mt-4 block">Add your own idea</label><div class="mt-2 flex flex-col gap-2 sm:flex-row"><input v-model="customActivityInputs[group.name]" :maxlength="customActivityLimit" :disabled="activityLimitReached" class="min-w-0 flex-1" :placeholder="`Add something to ${group.name}`" @keydown.enter.prevent="addCustomActivity(group.name)"><button type="button" class="add-activity" :disabled="activityLimitReached || !customActivityInputs[group.name].trim()" @click="addCustomActivity(group.name)">Add</button></div>
            </div>
          </section>
        </div>

        <section class="mt-6 rounded-lg border p-5" :class="photoCount ? 'border-[#C9D8B5] bg-[#EAF2DE]' : 'border-[#E8D8C4] bg-[#FBF7F1]'">
          <div class="flex items-start gap-3"><ImagePlus class="mt-0.5 size-5 shrink-0 text-[#B4234A]" /><div class="min-w-0 flex-1"><h3 class="font-semibold">{{ photoCount ? 'Profile photo added' : 'Add one profile photo' }}</h3><p class="mt-1 text-sm leading-6 text-[#6E4D58]">{{ photoCount ? `You have ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}. You can add more later.` : 'A clear photo is required before your profile appears in discovery.' }}</p></div></div>
          <button type="button" class="secondary mt-4" :disabled="saving" @click="openPhotoSetup"><ImagePlus class="size-4" />{{ saving ? 'Saving…' : photoCount ? 'Manage photos' : 'Upload a photo' }}</button>
        </section>

        <div class="mt-6 rounded-lg bg-[#F3E8DA] p-4 text-sm leading-6 text-[#4D2F39]"><strong>Everything else is optional.</strong> Add lifestyle details, more activities, availability and detailed filters later from your profile and Match preferences.</div>
        <p class="mt-5 text-xs leading-5 text-[#6E4D58]">By finishing setup, you agree to our <NuxtLink to="/terms-of-service" class="font-semibold underline">Terms of Service</NuxtLink> and <NuxtLink to="/acceptable-use" class="font-semibold underline">Acceptable Use Policy</NuxtLink>.</p>
        <div class="actions"><button class="secondary" type="button" @click="step = 2"><ArrowLeft class="size-4" />Back</button><button :disabled="saving || !setupReady" class="primary" type="button" @click="finish"><Check class="size-4" />{{ saving ? 'Finishing…' : 'Finish and discover people' }}</button></div>
        <p v-if="!setupReady" class="mt-3 text-right text-xs font-semibold text-[#8F1839]">Add {{ activitiesReady ? 'a photo' : 'three activities' }}{{ !activitiesReady && !photoCount ? ' and a photo' : '' }} to finish.</p>
      </section>

      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.onboarding-card { border-radius: .5rem; background: white; padding: 1.5rem; box-shadow: 0 14px 34px rgba(180,35,74,.09); }
.step-title { display: flex; align-items: flex-start; gap: .75rem; }
.step-title h2 { font-size: 1.25rem; font-weight: 650; }
.step-title p { margin-top: .25rem; color: #6E4D58; font-size: .875rem; line-height: 1.5; }
label, legend { color: #4D2F39; font-size: .875rem; font-weight: 600; }
input:not([type='checkbox']), textarea, select { margin-top: .4rem; width: 100%; border: 1px solid #E8D8C4; border-radius: .5rem; background: #FBF7F1; padding: .75rem; outline: none; }
input:focus, textarea:focus, select:focus { border-color: #B4234A; box-shadow: 0 0 0 2px #F7B7C4; }
.field-hint { display: block; margin-top: .35rem; color: #6E4D58; font-size: .75rem; font-weight: 500; }
.field-hint.success { color: #52713A; }
.field-hint.error { color: #8F1839; }
.dob-field { margin-top: 0; border: 1px solid #E8D8C4; border-radius: .65rem; background: #FFFDFC; padding: 1rem; }
.dob-field legend { padding: 0 .35rem; }
.dob-grid { display: grid; grid-template-columns: .7fr 1.4fr 1fr; gap: .65rem; margin-top: .7rem; }
.dob-grid label span { font-size: .75rem; color: #6E4D58; }
.activity-group { border: 1px solid #E8D8C4; border-radius: .65rem; background: #FFFDFC; padding: 1rem; }
.choice { border-radius: 9999px; background: #FBF7F1; padding: .6rem .85rem; color: #4D2F39; font-size: .875rem; font-weight: 600; }
.choice.selected { background: #B4234A; color: white; }
.choice:disabled { cursor: not-allowed; opacity: .4; }
.add-activity { min-height: 2.75rem; border-radius: .5rem; background: #4D2F39; padding: 0 1rem; color: white; font-size: .875rem; font-weight: 700; }
.add-activity:disabled { cursor: not-allowed; opacity: .45; }
.actions { margin-top: 2rem; display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem; }
.primary, .secondary { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .5rem; padding: .75rem 1.1rem; font-size: .875rem; font-weight: 700; }
.primary { margin-left: auto; background: #B4234A; color: white; }
.secondary { background: #F3E8DA; color: #4D2F39; }
.primary:disabled { cursor: not-allowed; opacity: .45; }
@media (min-width: 640px) { .onboarding-card { padding: 2rem; } }
</style>
