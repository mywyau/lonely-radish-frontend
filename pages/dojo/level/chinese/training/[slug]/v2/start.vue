<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { chineseXp, chineseXpHintUsed } from '~/config/dojo/xp_config'
import { levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const levelNumber = computed(() => levelIdToNumbers(slug.value) ?? slug.value)
</script>

<template>
  <DojoStartPage :heading="`Level ${levelNumber} · Chinese dojo`"
    description="See the meaning and type the Chinese word. Great for character recall and typing fluency."
    :start-to="`/dojo/level/chinese/training/${slug}/v2`" start-label="Start chinese exercise" :xp-rules="[
      { action: 'No hint used', xp: `+${chineseXp} XP` },
      { action: 'Hint used', xp: `+${chineseXpHintUsed} XP` },
      { action: 'Unlimited retries', xp: 'check the hint if you are stuck' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'Hints reveal Jyutping and reduce XP for that word, so use them strategically.',
      'Try to answer before checking hints to maximize XP and retention.'
    ]" />
</template>
