<script setup lang="ts">
import { HeartHandshake, RefreshCw, Sparkles } from '@lucide/vue'

const props = withDefaults(defineProps<{
  activities?: string[]
  personalInterests?: string[]
  flipped?: boolean
  preview?: boolean
}>(), {
  activities: () => [],
  personalInterests: () => [],
  flipped: false,
  preview: false,
})

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="profile-flip-card w-full text-left"
    :class="props.flipped && 'is-flipped'"
    :aria-pressed="props.flipped"
    :aria-label="props.flipped ? 'Show activities' : 'Show personal interests'"
    @click="emit('toggle')"
  >
    <span class="profile-flip-inner">
      <span class="profile-flip-face profile-flip-front">
        <span class="panel-heading">
          <span class="panel-icon panel-icon-activity"><HeartHandshake class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1">
            <span class="panel-kicker">Date ideas</span>
            <span class="panel-title">Activities I’d enjoy together</span>
          </span>
          <span class="panel-count">{{ props.activities.length }}</span>
        </span>
        <span class="panel-description">Plans that would make an easy, enjoyable date.</span>
        <span v-if="props.activities.length" class="panel-tags">
          <span v-for="activity in props.activities" :key="activity" class="activity-tag">
            <Sparkles class="size-3.5 shrink-0" aria-hidden="true" />{{ activity }}
          </span>
        </span>
        <span v-else class="panel-empty">No activities selected yet.</span>
        <span class="flip-prompt">See personal interests <RefreshCw class="size-3.5" aria-hidden="true" /></span>
      </span>

      <span class="profile-flip-face profile-flip-back">
        <span class="panel-heading">
          <span class="panel-icon panel-icon-interest"><Sparkles class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1">
            <span class="panel-kicker">A little about me</span>
            <span class="panel-title">{{ props.preview ? 'My personal interests' : 'Personal interests' }}</span>
          </span>
          <span class="panel-count panel-count-interest">{{ props.personalInterests.length }}</span>
        </span>
        <span class="panel-description">{{ props.preview ? 'The things that say a little more about me.' : 'The things that say a little more about them.' }}</span>
        <span v-if="props.personalInterests.length" class="panel-tags">
          <span v-for="interest in props.personalInterests" :key="interest" class="interest-tag">
            <span class="interest-dot" aria-hidden="true" />{{ interest }}
          </span>
        </span>
        <span v-else class="panel-empty">{{ props.preview ? 'No personal interests added yet.' : 'They have not shared any personal interests yet.' }}</span>
        <span class="flip-prompt flip-prompt-interest">See date activities <RefreshCw class="size-3.5" aria-hidden="true" /></span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.profile-flip-card {
  min-height: 16rem;
  border-radius: .75rem;
  outline: none;
  perspective: 1000px;
  transition: filter .2s ease, transform .2s ease;
}

.profile-flip-card:hover,
.profile-flip-card:focus-visible {
  filter: brightness(1.025) drop-shadow(0 14px 20px rgba(180, 35, 74, .16));
  transform: translateY(-2px);
}

.profile-flip-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(180, 35, 74, .3);
}

.profile-flip-inner {
  position: relative;
  display: block;
  min-height: 16rem;
  transform-style: preserve-3d;
  transition: transform .55s cubic-bezier(.2, .7, .2, 1);
}

.profile-flip-card.is-flipped .profile-flip-inner {
  transform: rotateY(180deg);
}

.profile-flip-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  border: 1px solid rgba(180, 35, 74, .1);
  border-radius: .75rem;
  padding: 1.25rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.profile-flip-front {
  background:
    radial-gradient(circle at 100% 0, rgba(215, 167, 179, .7) 0, rgba(215, 167, 179, 0) 40%),
    linear-gradient(145deg, #F7CAD4 0%, #EDB1C0 100%);
}

.profile-flip-back {
  background:
    radial-gradient(circle at 100% 0, rgba(159, 183, 127, .65) 0, rgba(159, 183, 127, 0) 40%),
    linear-gradient(145deg, #DCE9C8 0%, #C4D7A6 100%);
  transform: rotateY(180deg);
}

.panel-heading { display: flex; align-items: center; gap: .75rem; }
.panel-icon { display: inline-flex; height: 2.5rem; width: 2.5rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: .7rem; }
.panel-icon-activity { background: #B4234A; color: white; }
.panel-icon-interest { background: #627D47; color: white; }
.panel-kicker { display: block; color: #8F1839; font-size: .66rem; font-weight: 850; letter-spacing: .09em; text-transform: uppercase; }
.profile-flip-back .panel-kicker { color: #526B3C; }
.panel-title { display: block; margin-top: .12rem; color: #2A1520; font-size: 1.08rem; font-weight: 750; line-height: 1.2; }
.panel-count { display: inline-flex; min-width: 2rem; justify-content: center; border-radius: 999px; background: rgba(255,255,255,.75); padding: .35rem .55rem; color: #8F1839; font-size: .75rem; font-weight: 850; }
.panel-count-interest { color: #526B3C; }
.panel-description { display: block; margin-top: .9rem; color: #6E4D58; font-size: .78rem; line-height: 1.4; }
.panel-tags { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .85rem; padding-bottom: .6rem; }
.activity-tag,
.interest-tag { display: inline-flex; align-items: center; gap: .35rem; border: 1px solid rgba(180,35,74,.1); border-radius: 999px; background: rgba(255,255,255,.82); padding: .5rem .7rem; color: #8F1839; font-size: .78rem; font-weight: 750; box-shadow: 0 3px 8px rgba(42,21,32,.04); }
.interest-tag { border-color: rgba(82,107,60,.13); color: #3E532D; }
.interest-dot { height: .4rem; width: .4rem; flex-shrink: 0; border-radius: 999px; background: #6E8B52; }
.panel-empty { display: block; margin-top: 1rem; color: #6E4D58; font-size: .82rem; }
.flip-prompt { display: flex; align-items: center; gap: .35rem; margin-top: auto; padding-top: .8rem; color: #8F1839; font-size: .7rem; font-weight: 800; }
.flip-prompt-interest { color: #526B3C; }

@media (prefers-reduced-motion: reduce) {
  .profile-flip-card,
  .profile-flip-inner { transition: none; }
  .profile-flip-card:hover,
  .profile-flip-card:focus-visible { transform: none; }
}
</style>
