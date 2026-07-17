<script setup lang="ts">
import { CalendarDays, Coffee, HeartHandshake, MapPin, ShieldCheck, Trash2, UserRound } from "@lucide/vue";

definePageMeta({
  title: "Mock Account · Lonely Radish",
});

const profile = reactive({
  firstName: "Maya",
  lastName: "Lee",
  neighbourhood: "East London",
  coffee: "Flat white",
  availability: "Thu evenings, Sat mornings",
});

const saved = ref(false);
const showDeletePanel = ref(false);
const deleteConfirmInput = ref("");

const fullName = computed(() => `${profile.firstName} ${profile.lastName}`.trim());

const datePreferences = [
  { icon: Coffee, label: "Coffee mood", value: "Quiet cafe, 30 minutes" },
  { icon: MapPin, label: "Distance", value: "Up to 4 km" },
  { icon: CalendarDays, label: "Best windows", value: "After work or weekend brunch" },
  { icon: ShieldCheck, label: "Safety", value: "Public places only" },
];

function saveProfile() {
  saved.value = true;
  window.setTimeout(() => {
    saved.value = false;
  }, 2200);
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#211A16] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <aside class="space-y-4">
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="flex size-14 items-center justify-center rounded-full bg-[#F6E1E1] text-xl font-semibold">
              {{ profile.firstName.charAt(0) }}
            </div>
            <div>
              <p class="text-sm text-[#6B5C52]">Mock profile</p>
              <h1 class="text-2xl font-semibold">{{ fullName }}</h1>
            </div>
          </div>

          <p class="mt-5 text-sm leading-6 text-[#6B5C52]">
            Auth is disabled for now. This account screen uses local prototype data so the full product shell can be reviewed.
          </p>
        </div>

        <div class="rounded-lg bg-[#211A16] p-6 text-white shadow-sm">
          <HeartHandshake class="size-6 text-[#E8C79F]" aria-hidden="true" />
          <h2 class="mt-4 text-lg font-semibold">Plan preview</h2>
          <p class="mt-2 text-sm leading-6 text-white/72">
            Free prototype access. Premium matching and planning controls are mocked on the upgrade page.
          </p>
          <NuxtLink
            to="/upgrade"
            class="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#211A16] transition hover:bg-[#F3E8DA]"
          >
            View plans
          </NuxtLink>
        </div>
      </aside>

      <div class="space-y-5">
        <section class="rounded-lg bg-white p-6 shadow-sm">
          <div class="flex items-start gap-3">
            <UserRound class="mt-1 size-5 text-[#B05D45]" aria-hidden="true" />
            <div>
              <h2 class="text-xl font-semibold">Profile basics</h2>
              <p class="mt-1 text-sm text-[#6B5C52]">
                Draft the minimum profile data needed for a coffee-date matching flow.
              </p>
            </div>
          </div>

          <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="saveProfile">
            <label class="block text-sm font-medium">
              First name
              <input v-model="profile.firstName" class="field" type="text">
            </label>

            <label class="block text-sm font-medium">
              Last name
              <input v-model="profile.lastName" class="field" type="text">
            </label>

            <label class="block text-sm font-medium">
              Neighbourhood
              <input v-model="profile.neighbourhood" class="field" type="text">
            </label>

            <label class="block text-sm font-medium">
              Coffee order
              <input v-model="profile.coffee" class="field" type="text">
            </label>

            <label class="block text-sm font-medium sm:col-span-2">
              Availability
              <input v-model="profile.availability" class="field" type="text">
            </label>

            <div class="sm:col-span-2">
              <button type="submit" class="rounded-lg bg-[#211A16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3A302A]">
                Save mock profile
              </button>
              <span v-if="saved" class="ml-3 text-sm font-medium text-[#2F7D63]">Saved locally.</span>
            </div>
          </form>
        </section>

        <section class="grid gap-3 sm:grid-cols-2">
          <article v-for="item in datePreferences" :key="item.label" class="rounded-lg bg-white p-5 shadow-sm">
            <component :is="item.icon" class="size-5 text-[#B05D45]" aria-hidden="true" />
            <p class="mt-3 text-sm font-semibold">{{ item.label }}</p>
            <p class="mt-1 text-sm text-[#6B5C52]">{{ item.value }}</p>
          </article>
        </section>

        <section class="rounded-lg border border-red-200 bg-[#F6E1E1] p-6">
          <div class="flex items-start gap-3">
            <Trash2 class="mt-1 size-5 text-red-800" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold">Danger zone preview</h2>
              <p class="mt-2 text-sm text-red-900/80">
                Account deletion is disabled in prototype mode. This block shows the future flow without touching real data.
              </p>

              <button
                v-if="!showDeletePanel"
                type="button"
                class="mt-4 rounded-lg bg-white/80 px-4 py-2 text-sm font-semibold text-red-900 transition hover:bg-white"
                @click="showDeletePanel = true"
              >
                Show delete mock
              </button>

              <div v-else class="mt-4 space-y-3">
                <input
                  v-model="deleteConfirmInput"
                  class="field border-red-200"
                  placeholder="Type delete"
                  type="text"
                >
                <button
                  type="button"
                  class="rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="deleteConfirmInput.trim().toLowerCase() !== 'delete'"
                  @click="showDeletePanel = false; deleteConfirmInput = ''"
                >
                  Close mock delete flow
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
  border: 1px solid #D8C8B6;
  background: #FBF7F1;
  padding: 0.7rem 0.85rem;
  font-size: 0.95rem;
  outline: none;
}

.field:focus {
  border-color: #B05D45;
  box-shadow: 0 0 0 3px rgba(176, 93, 69, 0.16);
}
</style>
