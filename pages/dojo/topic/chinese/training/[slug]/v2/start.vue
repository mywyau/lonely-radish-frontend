<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { chineseXp, chineseXpHintUsed } from '~/config/dojo/xp_config'
import { sortedTopics } from '~/utils/topics/topics'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const { isLoggedIn } = useMeStateV2()

const topicTitle = computed(() =>
  sortedTopics.find(topic => topic.id === slug.value)?.title ?? slug.value
)
</script>

<template>
  <DojoStartPage :heading="`${topicTitle}`"
    description="Type the Chinese from this topic to strengthen typing skills and practical recall."
    :guest-note="isLoggedIn ? 'Signed in: XP from this run will be saved.' : 'Guest mode: XP from this run is preview only and will not be saved.'"
    :start-to="`/dojo/topic/chinese/training/${slug}/v2`" :start-label="'Start exercise'" :xp-rules="[
      { action: 'No hint used', xp: `+${chineseXp} XP` },
      { action: 'Hint used', xp: `+${chineseXpHintUsed} XP` },
      { action: 'Unlimited retries', xp: 'check the hint if you are stuck' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'Listen to word audio whenever available to link meaning, sound, and character form.',
      'Hints can speed up a run, but they reduce XP for that answer.',
      'Aim for complete sessions to reinforce a full topic in one pass and to be awarded the xp.'
    ]" />
</template>
