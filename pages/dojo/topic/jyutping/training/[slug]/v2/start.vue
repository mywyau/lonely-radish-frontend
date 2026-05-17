<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { jyutpingXp, jyutpingXpHintUsed } from '~/config/dojo/xp_config'
import { sortedTopics } from '~/utils/topics/topics'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const { isLoggedIn } = useMeStateV2()

const topicTitle = computed(() =>
  sortedTopics.find(topic => topic.id === slug.value)?.title ?? slug.value
)
</script>

<template>
  <DojoStartPage theme="purple" :heading="`${topicTitle}`"
    description="Type the Jyutping for words in this topic and build typing skills and recall."
    :guest-note="isLoggedIn ? 'Signed in: XP from this run will be saved.' : 'Guest mode: XP from this run is preview only and will not be saved.'"
    :start-to="`/dojo/topic/jyutping/training/${slug}/v2`" :start-label="'Start exercise'" :xp-rules="[
      { action: 'No hint used', xp: `+${jyutpingXp} XP` },
      { action: 'Hint used', xp: `+${jyutpingXpHintUsed} XP` },
      { action: 'Unlimited retries', xp: 'check the hint if you are stuck' }
    ]" :keyboard-setup-tips="[
      'Keep an English keyboard active.',
    ]" :tips="[
      'Hinted answers still count but award lower XP than no-hint answers.',
      'Great exercise for beginners or helping to learn new words.',
    ]" />
</template>
