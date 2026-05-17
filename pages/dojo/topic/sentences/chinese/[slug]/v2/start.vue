<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { chineseSentenceXp, chineseSentenceXpHintUsed } from '~/config/dojo/xp_config'
import { sortedTopics } from '~/utils/topics/topics'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const { isLoggedIn } = useMeStateV2()

const topicTitle = computed(() =>
  sortedTopics.find(topic => topic.id === slug.value)?.title ?? slug.value
)
</script>

<template>
  <DojoStartPage theme="blush" :heading="`${topicTitle}`"
    description="Practice typing out whole sentences from this topic to challenge and flex typing skills."
    :guest-note="isLoggedIn ? 'Signed in: XP from this run will be saved.' : 'Guest mode: XP from this run is preview only and will not be saved.'"
    :start-to="`/dojo/topic/sentences/chinese/${slug}/v2`" :start-label="'Start exercise'" :xp-rules="[
      { action: 'No hint used', xp: `+${chineseSentenceXp} XP` },
      { action: 'Hint used', xp: `+${chineseSentenceXpHintUsed} XP` },
      { action: 'Unlimited retries', xp: 'check the hint if you are stuck' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'Use sentence context to predict likely words before typing.',
      'Hints are useful for blocked moments but reduce XP gained.',
      'Keep a steady pace — repeated sentence patterns will feel easier each run.'
    ]" />
</template>
