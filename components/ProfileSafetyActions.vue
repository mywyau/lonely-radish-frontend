<script setup lang="ts">
const props = defineProps<{ profileSlug: string; profileName: string }>()
const open = ref(false)
const mode = ref<'block' | 'report'>('block')
const category = ref('')
const details = ref('')
const alsoBlock = ref(true)
const submitting = ref(false)
const errorMessage = ref('')

function show(next: 'block' | 'report') {
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
  <div class="mt-4 flex gap-4 border-t border-[#E8D8C4] pt-4 text-xs font-semibold text-[#8F1839]">
    <button type="button" class="hover:underline" @click="show('report')">Report profile</button>
    <button type="button" class="hover:underline" @click="show('block')">Block user</button>
  </div>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" @click.self="close">
    <section role="dialog" aria-modal="true" aria-labelledby="safety-title" class="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-2xl">
      <template v-if="mode === 'block'">
        <h2 id="safety-title" class="text-2xl font-semibold">Block {{ profileName }}?</h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">You will no longer see each other. Any match or plan between you will close immediately. They will not be told you blocked them.</p>
        <div class="mt-6 flex gap-2"><button class="flex-1 rounded-lg bg-[#F3E8DA] px-4 py-3 text-sm font-semibold" :disabled="submitting" @click="close">Cancel</button><button class="flex-1 rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="submitting" @click="block">{{ submitting ? 'Blocking…' : 'Block person' }}</button></div>
      </template>
      <form v-else @submit.prevent="report">
        <h2 id="safety-title" class="text-2xl font-semibold">Report {{ profileName }}</h2>
        <label class="mt-5 block text-sm font-semibold" for="report-category">Reason</label>
        <select id="report-category" v-model="category" required class="mt-2 w-full rounded-lg border border-[#D8C8B6] bg-white px-3 py-3 text-sm"><option value="" disabled>Choose a reason</option><option value="safety">Immediate safety concern</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="spam">Spam or scam</option><option value="other">Something else</option></select>
        <label class="mt-4 block text-sm font-semibold" for="report-details">Details <span class="font-normal text-[#6E4D58]">(optional)</span></label>
        <textarea id="report-details" v-model="details" maxlength="2000" rows="4" class="mt-2 w-full rounded-lg border border-[#D8C8B6] px-3 py-3 text-sm" placeholder="Share only what is useful for reviewing this report."></textarea>
        <label class="mt-3 flex items-start gap-2 text-sm"><input v-model="alsoBlock" type="checkbox" class="mt-1">Also block {{ profileName }} immediately</label>
        <p v-if="errorMessage" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
        <div class="mt-6 flex gap-2"><button type="button" class="flex-1 rounded-lg bg-[#F3E8DA] px-4 py-3 text-sm font-semibold" :disabled="submitting" @click="close">Cancel</button><button class="flex-1 rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="submitting">{{ submitting ? 'Submitting…' : 'Submit report' }}</button></div>
      </form>
      <p v-if="mode !== 'report' && errorMessage" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
    </section>
  </div>
</template>
