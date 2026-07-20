<script setup lang="ts">
import { CalendarDays, HeartHandshake, MapPin, ShieldCheck, Sparkles, Trash2, UserRound } from "@lucide/vue";

definePageMeta({
  title: "Account · Lonely Radish",
  middleware: "logged-in",
});

const { profile, loadProfile, saveProfile: persistProfile } = useMockProfile();
const { user, resolve } = useMeStateV2();

const saved = ref(false);
const showDeletePanel = ref(false);
const deleteConfirmInput = ref("");

const fullName = computed(() => `${profile.value.firstName} ${profile.value.lastName}`.trim());

const datePreferences = [
  { icon: Sparkles, label: "Activity mood", value: "Gallery walk, market, or low-key gig" },
  { icon: MapPin, label: "Distance", value: "Up to 4 km" },
  { icon: CalendarDays, label: "Best windows", value: "After work or weekend afternoons" },
  { icon: ShieldCheck, label: "Safety", value: "Public places only" },
];

async function saveProfile() {
  const updated = await $fetch<{ firstName: string | null; lastName: string | null }>("/api/account/v2/profile", {
    method: "POST", body: { firstName: profile.value.firstName, lastName: profile.value.lastName },
  });
  if (user.value) {
    user.value.firstName = updated.firstName;
    user.value.lastName = updated.lastName;
  }
  persistProfile();
  saved.value = true;
  window.setTimeout(() => {
    saved.value = false;
  }, 2200);
}

onMounted(async () => {
  loadProfile();
  await resolve();
  if (user.value?.firstName) profile.value.firstName = user.value.firstName;
  if (user.value?.lastName) profile.value.lastName = user.value.lastName;
});
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <aside class="space-y-4">
        <div class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-center gap-4">
            <div class="flex size-14 items-center justify-center rounded-full bg-[#FCE3E8] text-xl font-semibold text-[#B4234A]">
              {{ profile.firstName.charAt(0).toUpperCase() || '·' }}
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
          <h2 class="mt-4 text-lg font-semibold">Plan preview</h2>
          <p class="mt-2 text-sm leading-6 text-white/72">
            Free prototype access. Premium matching and planning controls are mocked on the upgrade page.
          </p>
          <div class="mt-5 flex flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap">
            <NuxtLink to="/upgrade" class="inline-flex justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#8F1839] transition hover:bg-[#F3E8DA]">View plans</NuxtLink>
            <NuxtLink to="/preferences" class="inline-flex justify-center rounded-lg bg-[#FCE3E8] px-4 py-2 text-sm font-semibold text-[#8F1839] transition hover:bg-[#F7D4DC]">Match preferences</NuxtLink>
            <NuxtLink to="/photos" class="inline-flex justify-center rounded-lg bg-[#F3E8DA] px-4 py-2 text-sm font-semibold text-[#8F1839] transition hover:bg-[#FCE3E8]">Profile photos</NuxtLink>
          </div>
        </div>
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

            <!-- <label class="block text-sm font-medium">
              Neighbourhood
              <input v-model="profile.neighbourhood" class="field" type="text">
            </label> -->

            <label class="block text-sm font-medium">
              Preferred activity
              <input v-model="profile.activity" class="field" type="text" placeholder="An activity you enjoy">
            </label>

            <label class="block text-sm font-medium sm:col-span-2">
              Availability
              <input v-model="profile.availability" class="field" type="text" placeholder="When are you usually free?">
            </label>

            <div class="flex flex-col items-start gap-2 sm:col-span-2 sm:flex-row sm:items-center">
              <button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839]">
                Save profile
              </button>
              <span v-if="saved" class="text-sm font-medium text-[#6E8B52]">Profile saved.</span>
            </div>
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
              <h2 class="text-lg font-semibold">Danger zone preview</h2>
              <p class="mt-2 text-sm text-[#4D2F39]">
                Account deletion is disabled in prototype mode. This block shows the future flow without touching real data.
              </p>

              <button
                v-if="!showDeletePanel"
                type="button"
                class="mt-4 rounded-lg bg-white/80 px-4 py-2 text-sm font-semibold text-[#8F1839] transition hover:bg-white"
                @click="showDeletePanel = true"
              >
                Show delete
              </button>

              <div v-else class="mt-4 space-y-3">
                <input
                  v-model="deleteConfirmInput"
                  class="field"
                  placeholder="Type delete"
                  type="text"
                >
                <button
                  type="button"
                  class="rounded-lg bg-[#8F1839] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="deleteConfirmInput.trim().toLowerCase() !== 'delete'"
                  @click="showDeletePanel = false; deleteConfirmInput = ''"
                >
                  Delete Profile
                </button>
              </div>
            </div>
          </div>
        </section>
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
