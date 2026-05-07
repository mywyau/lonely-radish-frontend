<!-- components/ui/AppIcon.vue -->
<script setup lang="ts">
import { appIcons, type AppIconName } from '@/config/ui/icons'

const props = withDefaults(defineProps<{
  icon: AppIconName
  size?: string
}>(), {
  size: 'h-5 w-5',
})
</script>

<template>
  <Icon
    :name="appIcons[props.icon]"
    :class="props.size"
    aria-hidden="true"
  />
</template>