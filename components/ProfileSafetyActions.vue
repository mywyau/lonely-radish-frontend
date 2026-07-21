<script setup lang="ts">
const props = defineProps<{ profileSlug: string; profileName: string }>()
const open = ref(false)
const mode = ref<'menu' | 'block' | 'report'>('menu')
const category = ref('')
const details = ref('')
const alsoBlock = ref(true)
const submitting = ref(false)
const errorMessage = ref('')

function show(next: 'menu' | 'block' | 'report') {
  mode.value = next
  errorMessage.value = ''
  open.value = true
}
function close() { if (!submitting.value) open.value = false }
async function block() {
  submitting.value = true; errorMessage.value = ''
  try {
    await $fetch(`/api/profiles/${props.profileSlug}/block`, { method: 'POST' })
    await navigateTo('/activities?safety=blocked')
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'This person could not be blocked.' }
  finally { submitting.value = false }
}
async function report() {
  if (!category.value) { errorMessage.value = 'Choose a reason for the report.'; return }
  submitting.value = true; errorMessage.value = ''
  try {
    await $fetch(`/api/profiles/${props.profileSlug}/report`, { method: 'POST', body: {
      category: category.value, details: details.value, alsoBlock: alsoBlock.value,
    } })
    await navigateTo(`/activities?safety=${alsoBlock.value ? 'reported-blocked' : 'reported'}`)
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your report could not be submitted.' }
  finally { submitting.value = false }
}
</script>

<template>
  <button type="button" class="mt-4 w-full text-center text-xs font-semibold text-[#6E4D58] underline decoration-[#D7A7B3] underline-offset-4" @click="show('menu')">Block or report {{ profileName }}</button>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" @click.self="close">
    <section role="dialog" aria-modal="true" aria-labelledby="safety-title" class="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-2xl">
      <template v-if="mode === 'menu'">
        <h2 id="safety-title" class="text-2xl font-semibold">Safety options</h2>
        <p class="mt-2 text-sm leading-6 text-[#6E4D58]">{{ profileName }} will not be told that you used these options.</p>
        <div class="mt-5 grid gap-2"><button class="rounded-lg bg-[#F3E8DA] px-4 py-3 text-left text-sm font-semibold" @click="mode = 'block'">Block {{ profileName }}</button><button class="rounded-lg bg-[#FCE3E8] px-4 py-3 text-left text-sm font-semibold text-[#8F1839]" @click="mode = 'report'">Report a safety concern</button></div>
      </template>
      <template v-else-if="mode === 'block'">
        <h2 id="safety-title" class="text-2xl font-semibold">Block {{ profileName }}?</h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">You will no longer see each other. Any match or plan between you will close immediately.</p>
        <div class="mt-6 flex gap-2"><button class="flex-1 rounded-lg bg-[#F3E8DA] px-4 py-3 text-sm font-semibold" :disabled="submitting" @click="mode = 'menu'">Back</button><button class="flex-1 rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="submitting" @click="block">{{ submitting ? 'Blocking…' : 'Block person' }}</button></div>
      </template>
      <form v-else @submit.prevent="report">
        <h2 id="safety-title" class="text-2xl font-semibold">Report {{ profileName }}</h2>
        <label class="mt-5 block text-sm font-semibold" for="report-category">Reason</label>
        <select id="report-category" v-model="category" required class="mt-2 w-full rounded-lg border border-[#D8C8B6] bg-white px-3 py-3 text-sm"><option value="" disabled>Choose a reason</option><option value="safety">Immediate safety concern</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="spam">Spam or scam</option><option value="other">Something else</option></select>
        <label class="mt-4 block text-sm font-semibold" for="report-details">Details <span class="font-normal text-[#6E4D58]">(optional)</span></label>
        <textarea id="report-details" v-model="details" maxlength="2000" rows="4" class="mt-2 w-full rounded-lg border border-[#D8C8B6] px-3 py-3 text-sm" placeholder="Share only what is useful for reviewing this report."></textarea>
        <label class="mt-3 flex items-start gap-2 text-sm"><input v-model="alsoBlock" type="checkbox" class="mt-1">Also block {{ profileName }} immediately</label>
        <p v-if="errorMessage" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
        <div class="mt-6 flex gap-2"><button type="button" class="flex-1 rounded-lg bg-[#F3E8DA] px-4 py-3 text-sm font-semibold" :disabled="submitting" @click="mode = 'menu'">Back</button><button class="flex-1 rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="submitting">{{ submitting ? 'Submitting…' : 'Submit report' }}</button></div>
      </form>
      <p v-if="mode !== 'report' && errorMessage" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <button type="button" class="mt-4 w-full text-center text-xs font-semibold text-[#6E4D58]" :disabled="submitting" @click="close">Cancel</button>
    </section>
  </div>
</template>
