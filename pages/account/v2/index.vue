<script setup lang="ts">
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Circle, HeartHandshake, MapPin, PauseCircle, ShieldCheck, Sparkles, Trash2, UserRound } from "@lucide/vue";

definePageMeta({
  title: "Account · Lonely Radish",
  middleware: "logged-in",
});

const { user, entitlement, resolve } = useMeStateV2();
const profile = reactive({ firstName: "", lastName: "", raceEthnicity: "" });
const raceEthnicityOptions = ['Asian', 'Black / African / Caribbean', 'Hispanic / Latino', 'Middle Eastern', 'North African', 'Native / Indigenous', 'Pacific Islander', 'White', 'Multiracial / multi-ethnic', 'Prefer not to say'];

const saved = ref(false);
const showDeletePanel = ref(false);
const showFinalDeleteConfirmation = ref(false);
const deleteConfirmInput = ref("");
const deletingAccount = ref(false);
const deleteError = ref("");
const deletionQueued = ref(false);
const pauseState = ref<{ paused: boolean; pausedUntil: string | null }>({ paused: false, pausedUntil: null });
const pauseChoice = ref('7_days');
const savingPause = ref(false);
const pauseError = ref('');
const contact = reactive({ phoneNumber: '', contactEmail: '', socialHandle: '', shareWithMatches: false });
const savingContact = ref(false);
const contactSaved = ref(false);
const contactError = ref('');
type ReadinessChecks = { profileBasics: boolean; photos: boolean; activities: boolean; location: boolean; generalPreferences: boolean; datingPreferences: boolean };
const readiness = ref<{ checks: ReadinessChecks; completed: number; total: number; percentage: number } | null>(null);
const readinessCollapsed = ref(false);
const readinessItems = computed(() => {
  const checks = readiness.value?.checks;
  return [
    { key: 'profileBasics', label: 'Profile basics', detail: 'Name, bio and identity', to: '/account/v2' },
    { key: 'photos', label: 'Profile photo', detail: 'Add at least one photo', to: '/photos' },
    { key: 'activities', label: 'Activity interests', detail: 'Choose what you would enjoy', to: '/preferences/activities' },
    { key: 'location', label: 'Approximate location', detail: 'Set a postcode for distance matching', to: '/preferences#location-and-age' },
    { key: 'generalPreferences', label: 'Age and distance', detail: 'Set a practical matching range', to: '/preferences#location-and-age' },
    { key: 'datingPreferences', label: 'Dating preferences', detail: 'Choose who appears for you', to: '/preferences/dating' },
  ].map(item => ({ ...item, complete: checks?.[item.key as keyof ReadinessChecks] === true }));
});

const fullName = computed(() => `${profile.firstName} ${profile.lastName}`.trim());
const planLabel = computed(() => entitlement.value?.plan === 'yearly' ? 'Yearly plan' : entitlement.value?.plan === 'monthly' ? 'Monthly plan' : 'Free plan');
const isPaidPlan = computed(() => entitlement.value?.plan === 'monthly' || entitlement.value?.plan === 'yearly');

const datePreferences = [
  { icon: Sparkles, label: "Activity mood", value: "Gallery walk, market, or low-key gig" },
  { icon: MapPin, label: "Distance", value: "Up to 4 km" },
  { icon: CalendarDays, label: "Best windows", value: "After work or weekend afternoons" },
  { icon: ShieldCheck, label: "Safety", value: "Public places only" },
];

async function saveProfile() {
  const [updated] = await Promise.all([
    $fetch<{ firstName: string | null; lastName: string | null }>("/api/account/v2/profile", {
      method: "POST", body: { firstName: profile.firstName, lastName: profile.lastName },
    }),
    $fetch('/api/profile/identity', { method: 'PUT', body: { raceEthnicity: profile.raceEthnicity } }),
  ]);
  if (user.value) {
    user.value.firstName = updated.firstName;
    user.value.lastName = updated.lastName;
  }
  saved.value = true;
  window.setTimeout(() => {
    saved.value = false;
  }, 2200);
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

async function updatePause(choice = pauseChoice.value) {
  savingPause.value = true;
  pauseError.value = '';
  try {
    const result = await $fetch<{ paused: boolean; pausedUntil: string | null }>('/api/account/pause', { method: 'PUT', body: { choice } });
    pauseState.value = result;
  } catch (error: any) { pauseError.value = error?.data?.statusMessage || 'Your pause setting could not be updated.'; }
  finally { savingPause.value = false; }
}

async function saveContactDetails() {
  savingContact.value = true;
  contactError.value = '';
  contactSaved.value = false;
  try {
    Object.assign(contact, await $fetch('/api/profile/contact', { method: 'PUT', body: contact }));
    contactSaved.value = true;
  } catch (error: any) { contactError.value = error?.data?.statusMessage || 'Contact details could not be saved.'; }
  finally { savingContact.value = false; }
}

onMounted(async () => {
  await resolve({ force: true });
  try { pauseState.value = await $fetch('/api/account/pause'); } catch { /* Account remains usable if pause status is unavailable. */ }
  try { Object.assign(contact, await $fetch('/api/profile/contact')); } catch { /* Contact details remain optional. */ }
  try { const result = await $fetch<any>('/api/profile/me'); profile.raceEthnicity = result.profile?.raceEthnicity || ''; } catch { /* Identity remains editable when profile data is available. */ }
  try {
    readiness.value = await $fetch('/api/profile/readiness');
    readinessCollapsed.value = readiness.value.percentage === 100;
  } catch { /* Readiness is helpful but does not block account access. */ }
  profile.firstName = user.value?.firstName || "";
  profile.lastName = user.value?.lastName || "";
});
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <aside class="space-y-4">
        <div class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-center gap-4">
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

        <div class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)]">
          <HeartHandshake class="size-6 text-[#F7B7C4]" aria-hidden="true" />
          <div class="mt-4 flex flex-wrap items-center gap-2"><h2 class="text-lg font-semibold">Plan preview</h2><span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="isPaidPlan ? 'bg-[#EAF2DE] text-[#4D2F39]' : 'bg-white/15 text-white'">{{ isPaidPlan ? 'Paid' : 'Free' }}</span></div>
          <p class="mt-2 text-sm leading-6 text-white/72">You are currently on the <strong class="text-white">{{ planLabel }}</strong>.</p>
          <div class="mt-5 flex flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap">
            <NuxtLink to="/upgrade" class="inline-flex justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#8F1839] transition hover:bg-[#F3E8DA]">{{ isPaidPlan ? 'Manage plan' : 'View paid plans' }}</NuxtLink>
          </div>
        </div>

        <section class="rounded-lg bg-[#EAF2DE] p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3">
            <PauseCircle class="mt-1 size-5 text-[#6E8B52]" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold">Pause discovery</h2>
              <p class="mt-2 text-sm leading-6 text-[#4D2F39]">Hide your profile from new people while keeping existing matches, plans, and confirmed dates available.</p>
              <div v-if="pauseState.paused" class="mt-4 rounded-lg bg-white/75 p-4">
                <p class="text-sm font-semibold">Your profile is paused<span v-if="pauseState.pausedUntil"> until {{ new Date(pauseState.pausedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span><span v-else> indefinitely</span>.</p>
                <button type="button" class="mt-3 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="savingPause" @click="updatePause('resume')">{{ savingPause ? 'Resuming…' : 'Resume discovery now' }}</button>
              </div>
              <div v-else class="mt-4 flex flex-col gap-3">
                <label class="text-sm font-semibold">Pause for<select v-model="pauseChoice" class="field"><option value="7_days">7 days</option><option value="30_days">30 days</option><option value="indefinite">Until I resume</option></select></label>
                <button type="button" class="rounded-lg bg-[#4D2F39] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="savingPause" @click="updatePause()">{{ savingPause ? 'Pausing…' : 'Pause my profile' }}</button>
              </div>
              <p v-if="pauseError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ pauseError }}</p>
            </div>
          </div>
        </section>

        <section v-if="readiness" class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <button type="button" class="flex w-full items-start justify-between gap-4 text-left" :aria-expanded="!readinessCollapsed" aria-controls="discovery-readiness-details" @click="readinessCollapsed = !readinessCollapsed">
            <div><p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Discovery readiness</p><h2 class="mt-2 text-xl font-semibold">{{ readiness.percentage === 100 ? 'Ready to be discovered' : 'Complete your profile' }}</h2></div>
            <span class="flex shrink-0 items-center gap-2"><span class="rounded-full bg-[#FCE3E8] px-3 py-2 text-sm font-bold text-[#8F1839]">{{ readiness.percentage }}%</span><ChevronDown class="mt-2 size-5 text-[#8F1839] transition-transform" :class="!readinessCollapsed && 'rotate-180'" aria-hidden="true" /></span>
          </button>
          <div class="mt-4 h-2 overflow-hidden rounded-full bg-[#F3E8DA]" aria-hidden="true"><div class="h-full rounded-full bg-[#B4234A] transition-[width] duration-300" :style="{ width: `${readiness.percentage}%` }" /></div>
          <div id="discovery-readiness-details" v-show="!readinessCollapsed">
            <p class="mt-3 text-xs leading-5 text-[#6E4D58]">{{ readiness.completed }} of {{ readiness.total }} discovery essentials complete.</p>
            <ul class="mt-4 divide-y divide-[#E8D8C4]">
              <li v-for="item in readinessItems" :key="item.key" class="flex items-center gap-3 py-3">
                <CheckCircle2 v-if="item.complete" class="size-5 shrink-0 text-[#6E8B52]" aria-hidden="true" />
                <Circle v-else class="size-5 shrink-0 text-[#D7A7B3]" aria-hidden="true" />
                <div class="min-w-0 flex-1"><p class="text-sm font-semibold">{{ item.label }}</p><p class="text-xs text-[#6E4D58]">{{ item.complete ? 'Complete' : item.detail }}</p></div>
                <NuxtLink v-if="!item.complete" :to="item.to" :aria-label="`Complete ${item.label}`" class="inline-flex items-center gap-1 text-xs font-bold text-[#8F1839]">Add <ArrowRight class="size-3.5" /></NuxtLink>
              </li>
            </ul>
          </div>
        </section>
      </aside>

      <div class="space-y-5">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3">
            <UserRound class="mt-1 size-5 text-[#B4234A]" aria-hidden="true" />
            <div>
              <h2 class="text-xl font-semibold">Account Details</h2>
              <p class="mt-1 text-sm text-[#6E4D58]">
                Edit your account details here. These will only be shared with matches.
              </p>
            </div>
          </div>

          <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="saveProfile">
            <label class="block text-sm font-medium">
              First name
              <input v-model="profile.firstName" class="field" type="text" autocomplete="given-name" placeholder="Your first name">
            </label>

            <label class="block text-sm font-medium">
              Last name
              <input v-model="profile.lastName" class="field" type="text" autocomplete="family-name" placeholder="Your last name">
            </label>

            <label class="block text-sm font-medium sm:col-span-2">
              Racial or ethnic identity
              <select v-model="profile.raceEthnicity" class="field" required>
                <option value="" disabled>Select an option</option>
                <option v-for="option in raceEthnicityOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>

            <!-- <label class="block text-sm font-medium">
              Neighbourhood
              <input v-model="profile.neighbourhood" class="field" type="text">
            </label> -->

            <div class="flex flex-col items-start gap-2 sm:col-span-2 sm:flex-row sm:items-center">
              <button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839]">
                Save profile
              </button>
              <span v-if="saved" class="text-sm font-medium text-[#6E8B52]">Profile saved.</span>
            </div>
          </form>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <h2 class="text-xl font-semibold">Contact details for matches</h2>
          <p class="mt-2 text-sm leading-6 text-[#6E4D58]">These details are never shown in discovery and are only available to active matches when sharing is switched on.</p>
          <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="saveContactDetails">
            <label class="text-sm font-medium">Phone number <span class="font-normal text-[#6E4D58]">(optional)</span><input v-model="contact.phoneNumber" class="field" type="tel" autocomplete="tel" placeholder="+44 7700 900000"></label>
            <label class="text-sm font-medium">Contact email <span class="font-normal text-[#6E4D58]">(optional)</span><input v-model="contact.contactEmail" class="field" type="email" autocomplete="email" placeholder="you@example.com"></label>
            <label class="text-sm font-medium sm:col-span-2">Social or contact handle <span class="font-normal text-[#6E4D58]">(optional)</span><input v-model="contact.socialHandle" class="field" type="text" autocomplete="off" placeholder="@yourhandle or preferred contact app"></label>
            <label class="flex items-start gap-3 rounded-lg bg-[#F3E8DA] p-4 text-sm sm:col-span-2"><input v-model="contact.shareWithMatches" class="mt-1 size-4 accent-[#B4234A]" type="checkbox"><span><strong class="block">Share with active matches</strong><span class="mt-1 block leading-5 text-[#6E4D58]">Access ends if either person unmatches, rejects, or blocks the other.</span></span></label>
            <div class="flex items-center gap-3 sm:col-span-2"><button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="savingContact">{{ savingContact ? 'Saving…' : 'Save contact details' }}</button><span v-if="contactSaved" class="text-sm font-semibold text-[#6E8B52]" role="status">Contact details saved.</span></div>
            <p v-if="contactError" class="text-sm font-semibold text-[#8F1839] sm:col-span-2" role="alert">{{ contactError }}</p>
          </form>
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
