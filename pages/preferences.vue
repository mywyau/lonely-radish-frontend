<script setup lang="ts">
import { CalendarDays, Gamepad2, MapPin, ShieldCheck, SlidersHorizontal, Sparkles, Trophy, UsersRound } from '@lucide/vue'

definePageMeta({
  title: 'Match Preferences · Lonely Radish',
})

const preferences = reactive({
  distance: 4,
  ageRange: '28-36',
  neighbourhoods: ['East London', 'Hackney', 'Shoreditch'],
  activityPace: 'Low-key first',
  activityPreferences: [
    { name: 'Gallery walks', level: 'Love', mode: 'In person' },
    { name: 'Markets', level: 'Open to', mode: 'In person' },
    { name: 'Co-op games', level: 'Love', mode: 'Remote' },
    { name: 'Park tennis', level: 'Open to', mode: 'In person' },
  ],
  timing: ['Weekday evenings', 'Weekend afternoons'],
  publicOnly: true,
  remoteMeetups: true,
  smallerMatchPool: true,
})

const saved = ref(false)
const customActivity = ref('')

const preferenceLevels = ['Love', 'Open to', 'Not for me']
const meetupModes = ['In person', 'Remote', 'Either']
const activityCategories = [
  {
    name: 'Culture',
    options: ['Gallery walks', 'Museums', 'Theatre', 'Indie films', 'Live music', 'Comedy nights'],
  },
  {
    name: 'Food and drink',
    options: ['Markets', 'Casual food spots', 'Cooking classes', 'Dessert crawl', 'Picnic', 'Supper clubs'],
  },
  {
    name: 'Outdoors',
    options: ['Riverside walks', 'Hikes', 'Parks', 'Cycling', 'Street photography', 'Botanical gardens'],
  },
  {
    name: 'Sports',
    options: ['Park tennis', 'Climbing', 'Running clubs', 'Table tennis', 'Casual football', 'Swimming'],
  },
  {
    name: 'Gaming',
    options: ['Co-op games', 'Puzzle rooms', 'Party games', 'Strategy games', 'Cosy games', 'Board games'],
  },
  {
    name: 'Learning',
    options: ['Workshops', 'Talks', 'Language exchange', 'Bookshops', 'Craft classes', 'Trivia nights'],
  },
]
const timingOptions = ['Weekday evenings', 'Friday night', 'Weekend mornings', 'Weekend afternoons']

const selectedActivityNames = computed(() => preferences.activityPreferences.map(activity => activity.name))

function toggleValue(list: string[], value: string) {
  const index = list.indexOf(value)
  if (index >= 0) {
    list.splice(index, 1)
    return
  }

  list.push(value)
}

function getActivity(name: string) {
  return preferences.activityPreferences.find(activity => activity.name === name)
}

function addActivity(name: string, mode = 'In person') {
  const trimmed = name.trim()
  if (!trimmed || getActivity(trimmed)) return

  preferences.activityPreferences.push({
    name: trimmed,
    level: 'Open to',
    mode,
  })
}

function toggleActivity(name: string, mode = 'In person') {
  const activity = getActivity(name)
  if (activity) {
    preferences.activityPreferences = preferences.activityPreferences.filter(item => item.name !== name)
    return
  }

  addActivity(name, mode)
}

function removeActivity(name: string) {
  preferences.activityPreferences = preferences.activityPreferences.filter(activity => activity.name !== name)
}

function addCustomActivity() {
  addActivity(customActivity.value, preferences.remoteMeetups ? 'Either' : 'In person')
  customActivity.value = ''
}

function savePreferences() {
  saved.value = true
  window.setTimeout(() => {
    saved.value = false
  }, 2200)
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <aside class="space-y-4">
        <div class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)]">
          <SlidersHorizontal class="size-6 text-[#F7B7C4]" aria-hidden="true" />
          <h1 class="mt-4 text-3xl font-semibold">
            Match preferences
          </h1>
          <p class="mt-3 text-sm leading-6 text-white/72">
            Tune who appears in your mock match list. These settings are local prototype data for now.
          </p>
        </div>

        <div class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <UsersRound class="size-5 text-[#B4234A]" aria-hidden="true" />
          <h2 class="mt-3 text-lg font-semibold">
            Current match shape
          </h2>
          <dl class="mt-4 space-y-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-[#6E4D58]">Distance</dt>
              <dd class="font-semibold">{{ preferences.distance }} km</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[#6E4D58]">Age range</dt>
              <dd class="font-semibold">{{ preferences.ageRange }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[#6E4D58]">Pool size</dt>
              <dd class="font-semibold">{{ preferences.smallerMatchPool ? 'Focused' : 'Broad' }}</dd>
            </div>
          </dl>
        </div>
      </aside>

      <form class="space-y-5" @submit.prevent="savePreferences">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3">
            <MapPin class="mt-1 size-5 text-[#B4234A]" aria-hidden="true" />
            <div>
              <h2 class="text-xl font-semibold">Location and distance</h2>
              <p class="mt-1 text-sm text-[#6E4D58]">Keep matches close enough that making a plan still feels easy.</p>
            </div>
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="block text-sm font-medium">
              Maximum distance
              <input v-model.number="preferences.distance" class="field" max="20" min="1" type="number">
            </label>

            <label class="block text-sm font-medium">
              Age range
              <input v-model="preferences.ageRange" class="field" type="text">
            </label>

            <label class="block text-sm font-medium sm:col-span-2">
              Neighbourhoods
              <input v-model="preferences.neighbourhoods[0]" class="field" type="text">
            </label>
          </div>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3">
            <Sparkles class="mt-1 size-5 text-[#B4234A]" aria-hidden="true" />
            <div>
              <h2 class="text-xl font-semibold">Activities</h2>
              <p class="mt-1 text-sm text-[#6E4D58]">Choose the kinds of plans you would actually say yes to.</p>
            </div>
          </div>

          <div class="mt-6">
            <label class="block text-sm font-medium">
              First-plan pace
              <select v-model="preferences.activityPace" class="field">
                <option>Low-key first</option>
                <option>Open to something lively</option>
                <option>Prefer daytime plans</option>
                <option>Remote first</option>
              </select>
            </label>
          </div>

          <div class="mt-6 rounded-lg bg-[#FBF7F1] p-4">
            <label class="block text-sm font-medium">
              Add your own activity
              <div class="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  v-model="customActivity"
                  class="field mt-0"
                  placeholder="Bouldering, karaoke, chess, paddleboarding..."
                  type="text"
                  @keydown.enter.prevent="addCustomActivity"
                >
                <button
                  type="button"
                  class="rounded-lg bg-[#B4234A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8F1839]"
                  @click="addCustomActivity"
                >
                  Add activity
                </button>
              </div>
            </label>
          </div>

          <div class="mt-7 space-y-5">
            <div
              v-for="category in activityCategories"
              :key="category.name"
              class="rounded-lg bg-[#FBF7F1] p-4"
            >
              <div class="flex items-start gap-3">
                <component
                  :is="category.name === 'Sports' ? Trophy : category.name === 'Gaming' ? Gamepad2 : Sparkles"
                  class="mt-1 size-5 text-[#B4234A]"
                  aria-hidden="true"
                />
                <div>
                  <h3 class="text-sm font-semibold text-[#4D2F39]">
                    {{ category.name }}
                  </h3>
                  <p v-if="category.name === 'Sports'" class="mt-1 text-sm text-[#6E4D58]">
                    Choose movement-friendly ideas for active, public meetups.
                  </p>
                  <p v-else-if="category.name === 'Gaming'" class="mt-1 text-sm text-[#6E4D58]">
                    Match around online-first plans before deciding whether to meet offline.
                  </p>
                  <p v-else class="mt-1 text-sm text-[#6E4D58]">
                    Tap any activity to add it to your selected preferences.
                  </p>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="option in category.options"
                  :key="option"
                  type="button"
                  class="rounded-full px-3 py-2 text-sm font-semibold transition"
                  :class="selectedActivityNames.includes(option) ? 'bg-[#B4234A] text-white' : 'bg-white text-[#4D2F39] hover:bg-[#FCE3E8]'"
                  @click="toggleActivity(option, category.name === 'Gaming' ? 'Remote' : 'In person')"
                >
                  {{ option }}
                </button>
              </div>
            </div>
          </div>

          <div class="mt-7 rounded-lg bg-[#FCE3E8] p-4">
            <h3 class="text-sm font-semibold text-[#4D2F39]">
              Selected activity tags
            </h3>
            <p class="mt-1 text-sm text-[#6E4D58]">
              Mark each tag as something you love, are open to, or would rather avoid.
            </p>

            <div class="mt-4 grid gap-3">
              <article
                v-for="activity in preferences.activityPreferences"
                :key="activity.name"
                class="rounded-lg bg-white/75 p-4"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="font-semibold text-[#2A1520]">
                      {{ activity.name }}
                    </p>
                    <button
                      type="button"
                      class="mt-1 text-xs font-semibold text-[#8F1839] hover:underline"
                      @click="removeActivity(activity.name)"
                    >
                      Remove
                    </button>
                  </div>

                  <div class="flex flex-col gap-2 sm:items-end">
                    <div class="flex flex-wrap gap-1">
                      <button
                        v-for="level in preferenceLevels"
                        :key="level"
                        type="button"
                        class="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                        :class="activity.level === level ? 'bg-[#B4234A] text-white' : 'bg-[#F3E8DA] text-[#4D2F39] hover:bg-[#FCE3E8]'"
                        @click="activity.level = level"
                      >
                        {{ level }}
                      </button>
                    </div>

                    <div class="flex flex-wrap gap-1">
                      <button
                        v-for="mode in meetupModes"
                        :key="mode"
                        type="button"
                        class="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                        :class="activity.mode === mode ? 'bg-[#6E8B52] text-white' : 'bg-[#EAF2DE] text-[#4D2F39] hover:bg-[#DDECCB]'"
                        @click="activity.mode = mode"
                      >
                        {{ mode }}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3">
            <CalendarDays class="mt-1 size-5 text-[#B4234A]" aria-hidden="true" />
            <div>
              <h2 class="text-xl font-semibold">Timing and safety</h2>
              <p class="mt-1 text-sm text-[#6E4D58]">Availability still lives in your profile; this controls match filtering.</p>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            <button
              v-for="option in timingOptions"
              :key="option"
              type="button"
              class="rounded-full px-3 py-2 text-sm font-semibold transition"
              :class="preferences.timing.includes(option) ? 'bg-[#6E8B52] text-white' : 'bg-[#F3E8DA] text-[#4D2F39] hover:bg-[#EAF2DE]'"
              @click="toggleValue(preferences.timing, option)"
            >
              {{ option }}
            </button>
          </div>

          <div class="mt-6 grid gap-3">
            <label class="flex items-center justify-between gap-4 rounded-lg bg-[#FBF7F1] px-4 py-3 text-sm font-medium">
              <span class="inline-flex items-center gap-2">
                <ShieldCheck class="size-4 text-[#6E8B52]" aria-hidden="true" />
                Public places only
              </span>
              <input v-model="preferences.publicOnly" type="checkbox">
            </label>

            <label class="flex items-center justify-between gap-4 rounded-lg bg-[#FBF7F1] px-4 py-3 text-sm font-medium">
              <span class="inline-flex items-center gap-2">
                <Gamepad2 class="size-4 text-[#6E8B52]" aria-hidden="true" />
                Include remote gaming meetups
              </span>
              <input v-model="preferences.remoteMeetups" type="checkbox">
            </label>

            <label class="flex items-center justify-between gap-4 rounded-lg bg-[#FBF7F1] px-4 py-3 text-sm font-medium">
              <span>Show me a smaller, more relevant match pool</span>
              <input v-model="preferences.smallerMatchPool" type="checkbox">
            </label>
          </div>
        </section>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839]">
            Save preferences
          </button>
          <NuxtLink to="/matches" class="rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#8F1839] transition hover:bg-[#FCE3E8]">
            View matches
          </NuxtLink>
          <span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Preferences saved locally.</span>
        </div>
      </form>
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
