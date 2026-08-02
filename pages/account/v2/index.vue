<script setup lang="ts">
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Circle, MapPin, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UserRound } from "@lucide/vue";
import { raceEthnicityOptions, raceEthnicitySelfDescriptionLimit, usesRaceEthnicitySelfDescription } from '~/utils/raceEthnicity';
import { genderIdentityOptions } from '~/utils/genderIdentity';
import { sexualOrientationOptions } from '~/utils/sexualOrientation';

definePageMeta({
  title: "Account · Lonely Radish",
  middleware: "logged-in",
});

const { user } = useMeStateV2();
const profile = reactive({ firstName: "", lastName: "", displayName: "", genderIdentity: "", pronouns: "", raceEthnicity: "", raceEthnicitySelfDescription: "", sexualOrientation: "" });

const savingAccountDetails = ref(false);
const accountDetailsSaved = ref(false);
const accountDetailsDirty = ref(false);
const accountDetailsError = ref('');
const accountIdentityLoading = ref(true);
const savingProfileBasics = ref(false);
const profileBasicsSaved = ref(false);
const profileBasicsError = ref('');
const accountDetailsCollapsed = ref(false);
const contactDetailsCollapsed = ref(false);
const showDeletePanel = ref(false);
const showFinalDeleteConfirmation = ref(false);
const deleteConfirmInput = ref("");
const deletingAccount = ref(false);
const deleteError = ref("");
const deletionQueued = ref(false);
const contact = reactive({ phoneNumber: '', contactEmail: '', socialHandle: '', shareWithMatches: false });
const accountNameLimit = 80;
const pronounsLimit = 40;
const phoneNumberLimit = 30;
const contactEmailLimit = 254;
const socialHandleLimit = 100;
const requestTimeoutMs = 10000;
const savingContact = ref(false);
const contactSaved = ref(false);
const contactError = ref('');
const contactLoadError = ref('');
const contactLoading = ref(true);
const accountLoadError = ref('');
type ReadinessChecks = { profileBasics: boolean; photos: boolean; activities: boolean; location: boolean; generalPreferences: boolean; datingPreferences: boolean };
const readiness = ref<{ checks: ReadinessChecks; completed: number; total: number; percentage: number; photoCount: number; photosRequired: number } | null>(null);
const readinessCollapsed = ref(false);
const readinessLoading = ref(true);
const readinessError = ref('');

type ContactDetails = {
  phoneNumber?: string | null
  contactEmail?: string | null
  socialHandle?: string | null
  shareWithMatches?: boolean | null
}

function applyContactDetails(details: ContactDetails | null | undefined) {
  contact.phoneNumber = details?.phoneNumber || ''
  contact.contactEmail = details?.contactEmail || ''
  contact.socialHandle = details?.socialHandle || ''
  contact.shareWithMatches = details?.shareWithMatches === true
}
const readinessItems = computed(() => {
  const checks = readiness.value?.checks;
  return [
    { key: 'profileBasics', label: 'Profile basics', detail: 'Name, bio and identity', to: '/account/v2' },
    { key: 'photos', label: 'Profile photo', detail: `${readiness.value?.photoCount ?? 0} added · at least ${readiness.value?.photosRequired ?? 1} required`, to: '/photos' },
    { key: 'activities', label: 'Activity interests', detail: 'Choose what you would enjoy', to: '/preferences/activities' },
    { key: 'location', label: 'Approximate location', detail: 'Set a postcode for distance matching', to: '/preferences#location-and-age' },
    { key: 'generalPreferences', label: 'Age and distance', detail: 'Set a practical matching range', to: '/preferences#location-and-age' },
    { key: 'datingPreferences', label: 'Dating preferences', detail: 'Choose who appears for you', to: '/preferences/dating' },
  ].map(item => ({ ...item, complete: checks?.[item.key as keyof ReadinessChecks] === true }));
});

const fullName = computed(() => `${profile.firstName} ${profile.lastName}`.trim());
const signInPath = computed(() => `/please-sign-in?redirect=${encodeURIComponent('/account/v2')}`);

const datePreferences = [
  { icon: Sparkles, label: "Activity mood", value: "Gallery walk, market, or low-key gig" },
  { icon: MapPin, label: "Distance", value: "Up to 4 km" },
  { icon: CalendarDays, label: "Best windows", value: "After work or weekend afternoons" },
  { icon: ShieldCheck, label: "Safety", value: "Public places only" },
];

function requestStatus(error: any) {
  return error?.statusCode || error?.response?.status || error?.data?.statusCode
}

function requestMessage(error: any, fallback: string) {
  if (requestStatus(error) === 401) {
    accountLoadError.value = 'Your sign-in session has expired. Sign in again to load and save your account.'
    return 'Your sign-in session has expired. Sign in again to continue.'
  }
  if (error?.name === 'AbortError' || /timeout|aborted/i.test(error?.message || '')) {
    return `${fallback} The request timed out; please try again.`
  }
  return error?.data?.statusMessage || error?.statusMessage || fallback
}

async function loadReadiness() {
  readinessLoading.value = true
  readinessError.value = ''
  try {
    readiness.value = await $fetch('/api/profile/readiness', { timeout: requestTimeoutMs })
    readinessCollapsed.value = readiness.value.percentage === 100
  } catch (error: any) {
    readiness.value = null
    readinessError.value = requestMessage(error, 'Account readiness could not be loaded.')
  } finally {
    readinessLoading.value = false
  }
}

async function saveAccountDetails() {
  accountDetailsError.value = '';
  accountDetailsSaved.value = false;
  if (!profile.firstName.trim() || !profile.lastName.trim()) {
    accountDetailsError.value = 'Add your first and last name.'
    return
  }
  savingAccountDetails.value = true
  try {
    const updated = await $fetch<{ firstName: string | null; lastName: string | null }>("/api/account/v2/profile", {
      method: "POST", body: { firstName: profile.firstName, lastName: profile.lastName }, timeout: requestTimeoutMs,
    })
    profile.firstName = updated.firstName || ''
    profile.lastName = updated.lastName || ''
    if (user.value) {
      user.value.firstName = updated.firstName;
      user.value.lastName = updated.lastName;
    }
    accountDetailsDirty.value = false
    accountDetailsSaved.value = true;
  } catch (error: any) {
    accountDetailsError.value = requestMessage(error, 'Account details could not be saved.');
  } finally { savingAccountDetails.value = false }
}

function markAccountDetailsChanged() {
  accountDetailsDirty.value = true
  accountDetailsSaved.value = false
  accountDetailsError.value = ''
}

async function saveProfileBasics() {
  profileBasicsError.value = ''
  profileBasicsSaved.value = false
  if (!profile.displayName.trim()) {
    profileBasicsError.value = 'Add the profile name shown to other members.'
    return
  }
  if (!profile.sexualOrientation) {
    profileBasicsError.value = 'Select your sexual orientation.'
    return
  }
  if (!profile.genderIdentity) {
    profileBasicsError.value = 'Select your gender identity.'
    return
  }
  if (!profile.raceEthnicity) {
    profileBasicsError.value = 'Select your racial or ethnic identity.'
    return
  }
  if (usesRaceEthnicitySelfDescription(profile.raceEthnicity) && !profile.raceEthnicitySelfDescription.trim()) {
    profileBasicsError.value = 'Describe your racial or ethnic identity.'
    return
  }
  savingProfileBasics.value = true
  try {
    Object.assign(profile, await $fetch('/api/profile/basics', {
      method: 'PUT',
      timeout: requestTimeoutMs,
      body: {
        displayName: profile.displayName,
        genderIdentity: profile.genderIdentity,
        pronouns: profile.pronouns,
        raceEthnicity: profile.raceEthnicity,
        raceEthnicitySelfDescription: profile.raceEthnicitySelfDescription,
        sexualOrientation: profile.sexualOrientation,
      },
    }))
    profileBasicsSaved.value = true
  } catch (error: any) {
    profileBasicsError.value = requestMessage(error, 'Public profile details could not be saved.')
  } finally { savingProfileBasics.value = false }
}

async function deleteAccount() {
  if (deleteConfirmInput.value.trim().toLowerCase() !== 'delete' || deletingAccount.value) return;
  deletingAccount.value = true;
  deleteError.value = '';
  try {
    await $fetch('/api/account/v2', { method: 'DELETE', body: { confirm: deleteConfirmInput.value } });
    deletionQueued.value = true;
    window.setTimeout(() => { window.location.assign('/api/auth/logout'); }, 1200);
  } catch (error: any) {
    deleteError.value = error?.data?.statusMessage || 'Account deletion could not be started. Please try again.';
    deletingAccount.value = false;
  }
}

async function saveContactDetails() {
  contactError.value = '';
  contactSaved.value = false;
  const phoneNumber = contact.phoneNumber.trim()
  const contactEmail = contact.contactEmail.trim()
  const socialHandle = contact.socialHandle.trim()
  if (phoneNumber) {
    const digits = phoneNumber.replace(/\D/g, '')
    if (!/^[+()\d.\s-]+$/.test(phoneNumber) || digits.length < 7 || digits.length > 15) {
      contactError.value = 'Enter a valid phone number containing 7 to 15 digits.'
      return
    }
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    contactError.value = 'Enter a valid contact email address.'
    return
  }
  if (contact.shareWithMatches && !phoneNumber && !contactEmail && !socialHandle) {
    contactError.value = 'Add at least one contact detail before sharing with matches.'
    return
  }
  savingContact.value = true;
  try {
    applyContactDetails(await $fetch<ContactDetails>('/api/profile/contact', {
      method: 'PUT',
      timeout: requestTimeoutMs,
      body: { phoneNumber, contactEmail, socialHandle, shareWithMatches: contact.shareWithMatches },
    }));
    contactSaved.value = true;
  } catch (error: any) { contactError.value = requestMessage(error, 'Contact details could not be saved.'); }
  finally { savingContact.value = false; }
}

onMounted(async () => {
  const identityRequest = $fetch<{ firstName: string | null; lastName: string | null }>('/api/meV2', { timeout: requestTimeoutMs })
  const contactRequest = $fetch<ContactDetails>('/api/profile/contact', { timeout: requestTimeoutMs })
    .then((details) => applyContactDetails(details))
    .catch((error) => {
      contactLoadError.value = requestMessage(error, 'Existing contact details could not be loaded. You can still enter and save them again.')
    })
    .finally(() => { contactLoading.value = false })
  const profileRequest = $fetch<any>('/api/profile/me', { timeout: requestTimeoutMs })
  const readinessRequest = loadReadiness()
  const supportingResults = Promise.allSettled([profileRequest, readinessRequest])

  try {
    const identity = await identityRequest
    profile.firstName = identity.firstName || ''
    profile.lastName = identity.lastName || ''
    if (user.value) {
      user.value.firstName = identity.firstName
      user.value.lastName = identity.lastName
    }
  } catch (error: any) {
    profile.firstName = user.value?.firstName || ''
    profile.lastName = user.value?.lastName || ''
    accountLoadError.value = requestMessage(error, 'Your account name could not be loaded. Refresh the page and try again.')
  } finally {
    accountIdentityLoading.value = false
  }

  await contactRequest
  const [profileResult] = await supportingResults
  if (profileResult.status === 'fulfilled') {
    const result = profileResult.value
    profile.raceEthnicity = result.profile?.raceEthnicity || '';
    profile.raceEthnicitySelfDescription = result.profile?.raceEthnicitySelfDescription || '';
    profile.sexualOrientation = result.profile?.sexualOrientation || '';
    profile.genderIdentity = result.profile?.genderIdentity || '';
    profile.pronouns = result.profile?.pronouns || '';
    profile.displayName = result.profile?.displayName || '';
  } else {
    accountLoadError.value ||= requestMessage(profileResult.reason, 'Some account details could not be loaded. Refresh the page and try again.')
  }
});
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <aside class="space-y-4">
        <div v-if="accountLoadError" class="rounded-lg border border-[#E7A8B7] bg-[#FFF0F3] p-4 text-sm text-[#7A1733]" role="alert">
          <p class="font-semibold">{{ accountLoadError }}</p>
          <NuxtLink v-if="accountLoadError.includes('sign-in session')" :to="signInPath" class="mt-2 inline-block font-bold underline underline-offset-2">Sign in again</NuxtLink>
        </div>

        <div class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div v-if="accountIdentityLoading" class="flex items-center gap-4" role="status">
            <div class="size-14 animate-pulse rounded-full bg-[#FCE3E8]" aria-hidden="true"></div>
            <div>
              <p class="text-sm text-[#6E4D58]">Profile</p>
              <p class="mt-2 font-semibold text-[#6E4D58]">Loading account details…</p>
            </div>
          </div>
          <div v-else class="flex items-center gap-4">
            <div class="flex size-14 items-center justify-center rounded-full bg-[#FCE3E8] text-xl font-semibold text-[#B4234A]">
              {{ profile.firstName.charAt(0).toUpperCase() || '?' }}
            </div>
            <div>
              <p class="text-sm text-[#6E4D58]">Profile</p>
              <h1 class="text-2xl font-semibold">{{ fullName || 'Complete your profile' }}</h1>
            </div>
          </div>

          <p class="mt-5 text-sm leading-6 text-[#6E4D58]">
            Signed in as {{ user?.email }}. Your account name is saved securely to your profile.
          </p>
        </div>

        <NuxtLink to="/account/controls" class="group flex items-center gap-3 rounded-lg bg-[#2A1520] p-5 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)]">
          <SlidersHorizontal class="size-6 shrink-0 text-[#F7B7C4]" aria-hidden="true" />
          <span class="min-w-0 flex-1"><strong class="block">Plan and privacy</strong><span class="mt-1 block text-sm text-white/70">Subscription, profile pause and private attendance history</span></span>
          <ArrowRight class="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </NuxtLink>

        <NuxtLink to="/profile/details" class="group flex items-center gap-4 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] transition hover:-translate-y-0.5">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8] text-[#B4234A]"><UserRound class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1">
            <strong class="block text-lg font-semibold">About me & lifestyle</strong>
            <span class="mt-1 block text-sm leading-5 text-[#6E4D58]">Edit your bio and profile details.</span>
          </span>
          <ArrowRight class="size-5 shrink-0 text-[#8F1839] transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </NuxtLink>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div v-if="readinessLoading">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your profile</p>
            <p class="mt-2 text-sm text-[#6E4D58]" role="status">Checking your profile…</p>
          </div>
          <div v-else-if="readinessError">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your profile</p>
            <p class="mt-2 text-sm font-semibold text-[#8F1839]" role="alert">{{ readinessError }}</p>
            <div class="mt-3 flex flex-wrap gap-3">
              <button type="button" class="rounded-lg bg-[#F3E8DA] px-4 py-2 text-sm font-semibold text-[#4D2F39]" @click="loadReadiness">Try again</button>
              <NuxtLink v-if="readinessError.includes('sign-in session')" :to="signInPath" class="rounded-lg bg-[#B4234A] px-4 py-2 text-sm font-semibold text-white">Sign in again</NuxtLink>
            </div>
          </div>
          <template v-else-if="readiness">
            <button type="button" class="flex w-full items-start justify-between gap-4 text-left" :aria-expanded="!readinessCollapsed" aria-controls="discovery-readiness-details" @click="readinessCollapsed = !readinessCollapsed">
              <div><p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your profile</p><h2 class="mt-2 text-xl font-semibold">{{ readiness.percentage === 100 ? 'Ready to meet people' : 'A few things left to add' }}</h2></div>
              <span class="flex shrink-0 items-center gap-2"><span class="rounded-full bg-[#FCE3E8] px-3 py-2 text-sm font-bold text-[#8F1839]">{{ readiness.percentage }}%</span><ChevronDown class="mt-2 size-5 text-[#8F1839] transition-transform" :class="!readinessCollapsed && 'rotate-180'" aria-hidden="true" /></span>
            </button>
            <div class="mt-4 h-2 overflow-hidden rounded-full bg-[#F3E8DA]" aria-hidden="true"><div class="h-full rounded-full bg-[#B4234A] transition-[width] duration-300" :style="{ width: `${readiness.percentage}%` }" /></div>
            <div id="discovery-readiness-details" v-show="!readinessCollapsed">
              <p class="mt-3 text-xs leading-5 text-[#6E4D58]">{{ readiness.completed }} of {{ readiness.total }} profile essentials complete.</p>
              <ul class="mt-4 divide-y divide-[#E8D8C4]">
                <li v-for="item in readinessItems" :key="item.key" class="flex items-center gap-3 py-3">
                  <CheckCircle2 v-if="item.complete" class="size-5 shrink-0 text-[#6E8B52]" aria-hidden="true" />
                  <Circle v-else class="size-5 shrink-0 text-[#D7A7B3]" aria-hidden="true" />
                  <div class="min-w-0 flex-1"><p class="text-sm font-semibold">{{ item.label }}</p><p class="text-xs text-[#6E4D58]">{{ item.complete ? 'Complete' : item.detail }}</p></div>
                  <NuxtLink v-if="!item.complete" :to="item.to" :aria-label="`Complete ${item.label}`" class="inline-flex items-center gap-1 text-xs font-bold text-[#8F1839]">Add <ArrowRight class="size-3.5" /></NuxtLink>
                </li>
              </ul>
            </div>
          </template>
        </section>
      </aside>

      <div class="space-y-5">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-4 text-left"
            :aria-expanded="!accountDetailsCollapsed"
            aria-controls="account-details-panel"
            @click="accountDetailsCollapsed = !accountDetailsCollapsed"
          >
            <span class="flex items-start gap-3">
              <UserRound class="mt-1 size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
              <span>
                <span class="block text-xl font-semibold">Account details</span>
                <span class="mt-1 block text-sm text-[#6E4D58]">
                  Your private account name and public profile details.
                </span>
              </span>
            </span>
            <ChevronDown class="mt-1 size-5 shrink-0 text-[#8F1839] transition-transform" :class="!accountDetailsCollapsed && 'rotate-180'" aria-hidden="true" />
          </button>

          <div id="account-details-panel" v-show="!accountDetailsCollapsed">
            <p class="mt-5 text-sm text-[#6E4D58]">
              Your private account name is separate from the profile details shown to other members.
            </p>

            <form class="mt-6 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="saveAccountDetails">
              <label class="block text-sm font-medium">
                First name
                <input v-model="profile.firstName" class="field" type="text" :maxlength="accountNameLimit" autocomplete="given-name" required placeholder="Your first name" :disabled="accountIdentityLoading" @input="markAccountDetailsChanged">
              </label>

              <label class="block text-sm font-medium">
                Last name
                <input v-model="profile.lastName" class="field" type="text" :maxlength="accountNameLimit" autocomplete="family-name" required placeholder="Your last name" :disabled="accountIdentityLoading" @input="markAccountDetailsChanged">
              </label>

              <div class="flex flex-col items-start gap-2 sm:col-span-2 sm:flex-row sm:items-center">
                <button type="submit" :disabled="savingAccountDetails || accountIdentityLoading" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839] disabled:cursor-not-allowed disabled:opacity-50">
                  {{ savingAccountDetails ? 'Saving…' : 'Save account details' }}
                </button>
              </div>
              <p v-if="accountDetailsDirty && !accountDetailsError" class="rounded-lg bg-[#FFF1C7] p-3 text-sm font-semibold text-[#694C00] sm:col-span-2" role="status">You have unsaved account detail changes.</p>
              <p v-if="accountDetailsSaved" class="rounded-lg bg-[#EAF2DE] p-3 text-sm font-semibold text-[#52713A] sm:col-span-2" role="status">Account details saved successfully.</p>
              <p v-if="accountDetailsError" class="text-sm font-semibold text-[#8F1839] sm:col-span-2" role="alert">{{ accountDetailsError }}</p>
            </form>

            <div class="my-7 border-t border-[#E8D8C4]"></div>
            <div>
              <h3 class="text-lg font-semibold">Public profile details</h3>
              <p class="mt-1 text-sm leading-6 text-[#6E4D58]">These details help people understand who they may be meeting.</p>
            </div>

            <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="saveProfileBasics">
              <label class="block text-sm font-medium sm:col-span-2">
                Profile name
                <input v-model="profile.displayName" class="field" type="text" :maxlength="accountNameLimit" autocomplete="nickname" required placeholder="Name shown to other members">
                <span class="mt-1 block text-xs font-normal text-[#6E4D58]">This is your unique public name. Changing it does not change your private first or last name.</span>
              </label>

              <label class="block text-sm font-medium">
                Gender identity
                <select v-model="profile.genderIdentity" class="field" required>
                  <option value="" disabled>Select an option</option>
                  <option v-for="option in genderIdentityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>

              <label class="block text-sm font-medium">
                Pronouns <span class="font-normal text-[#6E4D58]">(optional)</span>
                <input v-model="profile.pronouns" class="field" type="text" :maxlength="pronounsLimit" autocomplete="off" placeholder="For example, she/her">
                <span class="mt-1 block text-xs font-normal text-[#6E4D58]">Shown on your profile when provided.</span>
              </label>

              <label class="block text-sm font-medium sm:col-span-2">
                Sexual orientation
                <select v-model="profile.sexualOrientation" class="field" required>
                  <option value="" disabled>Select an option</option>
                  <option v-for="option in sexualOrientationOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>

              <label class="block text-sm font-medium sm:col-span-2">
                Racial or ethnic identity
                <select v-model="profile.raceEthnicity" class="field" required>
                  <option value="" disabled>Select an option</option>
                  <option v-for="option in raceEthnicityOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </label>
              <label v-if="usesRaceEthnicitySelfDescription(profile.raceEthnicity)" class="block text-sm font-medium sm:col-span-2">
                How do you describe your background?
                <input v-model="profile.raceEthnicitySelfDescription" class="field" type="text" :maxlength="raceEthnicitySelfDescriptionLimit" required placeholder="Use the words that feel right to you">
                <span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ profile.raceEthnicitySelfDescription.length }}/{{ raceEthnicitySelfDescriptionLimit }}</span>
              </label>

              <div class="flex flex-col items-start gap-2 sm:col-span-2 sm:flex-row sm:items-center">
                <button type="submit" :disabled="savingProfileBasics" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839] disabled:cursor-not-allowed disabled:opacity-50">
                  {{ savingProfileBasics ? 'Saving…' : 'Save profile' }}
                </button>
                <span v-if="profileBasicsSaved" class="text-sm font-medium text-[#52713A]" role="status">Profile saved.</span>
              </div>
              <p v-if="profileBasicsError" class="text-sm font-semibold text-[#8F1839] sm:col-span-2" role="alert">{{ profileBasicsError }}</p>
            </form>
          </div>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-4 text-left"
            :aria-expanded="!contactDetailsCollapsed"
            aria-controls="contact-details-panel"
            @click="contactDetailsCollapsed = !contactDetailsCollapsed"
          >
            <span>
              <span class="block text-xl font-semibold">Contact details for matches</span>
              <span class="mt-1 block text-sm leading-6 text-[#6E4D58]">Private contact options for active matches.</span>
            </span>
            <ChevronDown class="mt-1 size-5 shrink-0 text-[#8F1839] transition-transform" :class="!contactDetailsCollapsed && 'rotate-180'" aria-hidden="true" />
          </button>
          <div id="contact-details-panel" v-show="!contactDetailsCollapsed">
            <p class="mt-5 text-sm leading-6 text-[#6E4D58]">These details are never shown in discovery and are only available to active matches when sharing is switched on.</p>
            <p v-if="contactLoadError" class="mt-4 rounded-lg bg-[#FFF1C7] p-3 text-sm font-semibold text-[#694C00]" role="alert">{{ contactLoadError }}</p>
            <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="saveContactDetails">
              <p v-if="contactLoading" class="text-sm text-[#6E4D58] sm:col-span-2" role="status">Loading contact details…</p>
              <fieldset class="contents" :disabled="contactLoading">
              <label class="text-sm font-medium">Phone number <span class="font-normal text-[#6E4D58]">(optional)</span><input v-model="contact.phoneNumber" class="field" type="tel" :maxlength="phoneNumberLimit" autocomplete="tel" placeholder="+44 7700 900000"></label>
              <label class="text-sm font-medium">Contact email <span class="font-normal text-[#6E4D58]">(optional)</span><input v-model="contact.contactEmail" class="field" type="email" :maxlength="contactEmailLimit" autocomplete="email" placeholder="you@example.com"></label>
              <label class="text-sm font-medium sm:col-span-2">Social or contact handle <span class="font-normal text-[#6E4D58]">(optional)</span><input v-model="contact.socialHandle" class="field" type="text" :maxlength="socialHandleLimit" autocomplete="off" placeholder="@yourhandle or preferred contact app"><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ contact.socialHandle.length }}/{{ socialHandleLimit }}</span></label>
              <label class="flex items-start gap-3 rounded-lg bg-[#F3E8DA] p-4 text-sm sm:col-span-2"><input v-model="contact.shareWithMatches" class="mt-1 size-4 accent-[#B4234A]" type="checkbox"><span><strong class="block">Share with active matches</strong><span class="mt-1 block leading-5 text-[#6E4D58]">Access ends if either person unmatches, rejects, or blocks the other.</span></span></label>
              <div class="flex items-center gap-3 sm:col-span-2"><button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="savingContact">{{ savingContact ? 'Saving…' : 'Save contact details' }}</button><span v-if="contactSaved" class="text-sm font-semibold text-[#6E8B52]" role="status">Contact details saved.</span></div>
              <p v-if="contactError" class="text-sm font-semibold text-[#8F1839] sm:col-span-2" role="alert">{{ contactError }}</p>
              </fieldset>
            </form>
          </div>
        </section>

        <!-- <section class="grid gap-3 sm:grid-cols-2">
          <article v-for="item in datePreferences" :key="item.label" class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
            <component :is="item.icon" class="size-5 text-[#B4234A]" aria-hidden="true" />
            <p class="mt-3 text-sm font-semibold">{{ item.label }}</p>
            <p class="mt-1 text-sm text-[#6E4D58]">{{ item.value }}</p>
          </article>
        </section> -->

        <section class="rounded-lg bg-[#FCE3E8] p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3">
            <Trash2 class="mt-1 size-5 text-[#8F1839]" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold">Delete account</h2>
              <p class="mt-2 text-sm text-[#4D2F39]">
                Permanently delete your profile, photos, preferences, interests, matches, date plans, notifications, subscription, and sign-in account. This cannot be undone.
              </p>

              <button
                v-if="!showDeletePanel"
                type="button"
                class="mt-4 rounded-lg bg-white/80 px-4 py-2 text-sm font-semibold text-[#8F1839] transition hover:bg-white"
                @click="showDeletePanel = true"
              >
                Delete my account
              </button>

              <div v-else class="mt-4 space-y-3">
                <input
                  v-model="deleteConfirmInput"
                  class="field"
                  placeholder="Type DELETE to confirm"
                  autocomplete="off"
                  type="text"
                >
                <button
                  type="button"
                  class="rounded-lg bg-[#8F1839] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="deleteConfirmInput.trim().toLowerCase() !== 'delete' || deletingAccount || deletionQueued"
                  @click="showFinalDeleteConfirmation = true; deleteError = ''"
                >
                  Continue to final confirmation
                </button>
                <button v-if="!deletionQueued" type="button" class="ml-2 rounded-lg bg-white/80 px-4 py-2 text-sm font-semibold text-[#4D2F39]" :disabled="deletingAccount" @click="showDeletePanel = false; deleteConfirmInput = ''; deleteError = ''">Cancel</button>
                <p v-if="deletionQueued" class="rounded-lg bg-white/75 p-3 text-sm font-semibold text-[#4D2F39]" role="status">Deletion has started. You are being signed out.</p>
                <p v-if="deleteError" class="text-sm font-semibold text-[#8F1839]" role="alert">{{ deleteError }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showFinalDeleteConfirmation" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/70 p-5" @click.self="!deletingAccount && (showFinalDeleteConfirmation = false)">
        <section role="dialog" aria-modal="true" aria-labelledby="delete-confirmation-title" class="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
          <Trash2 class="size-7 text-[#8F1839]" aria-hidden="true" />
          <h2 id="delete-confirmation-title" class="mt-4 text-2xl font-semibold">Delete your account permanently?</h2>
          <p class="mt-3 text-sm leading-6 text-[#6E4D58]">This is your final confirmation. Your profile, photos, matches, plans and sign-in account will be queued for permanent deletion. This cannot be undone.</p>
          <p class="mt-4 rounded-lg bg-[#FCE3E8] p-3 text-sm font-semibold text-[#8F1839]">Account: {{ user?.email }}</p>
          <p v-if="deleteError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ deleteError }}</p>
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" class="rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#4D2F39]" :disabled="deletingAccount" @click="showFinalDeleteConfirmation = false">Keep my account</button>
            <button type="button" class="rounded-lg bg-[#8F1839] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="deletingAccount || deletionQueued" @click="deleteAccount">{{ deletingAccount ? 'Starting deletion…' : deletionQueued ? 'Deletion queued' : 'Yes, permanently delete' }}</button>
          </div>
        </section>
      </div>
    </Teleport>
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
