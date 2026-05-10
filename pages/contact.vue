<script setup lang="ts">
import { Mail } from '@lucide/vue';

definePageMeta({
  title: 'Contact · TaroTea'
})
</script>

<template>
  <main class="contact-page max-w-xl mx-auto px-4 py-16 space-y-10">

    <!-- <BackLink /> -->

    <!-- Contact Card -->
    <section class="contact-card text-center space-y-4">

      <div class="mx-auto flex h-8 w-8 items-center justify-center text-gray-600">
        <Mail class="h-6 w-6" aria-hidden="true" />
      </div>

      <p class="text-xs uppercase tracking-wide text-gray-600">
        Email
      </p>

      <a href="mailto:contact@tarotea.co.uk" class="email-link hover:underline ">
        contact@tarotea.co.uk
      </a>

      <p class="text-gray-800 text-xs sm:text-sm">
        Have a question, found an issue, or want to share feedback?
        We’d love to hear from you.
      </p>

      <p class="text-xs text-gray-600">
        We usually respond in a few days.
      </p>
    </section>

  </main>
</template>


<style>
.contact-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

/* Clean block card */
.contact-card {
  border-radius: 24px;
  padding: 2rem;
  background: #F6E1E1;
  /* soft blush block */
}

/* Simple email accent */
.email-link {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.email-link:hover {
  opacity: 0.7;
}
</style>