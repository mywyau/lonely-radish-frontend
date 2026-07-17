<template>
  <footer class="mt-12 border-t border-gray-200">
    <div class="max-w-5xl mx-auto px-5 py-8 text-sm text-black">

      <!-- Brand -->
      <div class="text-center sm:text-left">
        <NuxtLink to="/" class="font-semibold text-lg hover:underline">
          Lonely Radish
        </NuxtLink>

        <p class="mt-2 text-gray-800 text-sm sm:max-w-sm">
          Casual coffee dates with clearer intent and less endless chat.
        </p>
      </div>

      <!-- Links -->
      <div class="mt-6 grid grid-cols-2 gap-y-3 gap-x-6 text-sm sm:flex sm:flex-row sm:justify-end sm:gap-6 sm:mt-4">

        <NuxtLink to="/contact" class="hover:underline">
          Contact
        </NuxtLink>

        <NuxtLink to="/privacy-notice" class="hover:underline">
          Privacy Notice
        </NuxtLink>

        <NuxtLink to="/refund-policy" class="hover:underline">
          Refund Policy
        </NuxtLink>

        <NuxtLink to="/terms-of-service" class="hover:underline">
          Terms of Service
        </NuxtLink>

        <NuxtLink to="/patch-notes" class="hover:underline">
          Patch Notes
        </NuxtLink>
      </div>

      <!-- Copyright -->
      <div class="mt-8 text-center text-xs text-gray-700">
        © {{ new Date().getFullYear() }} Lonely Radish
      </div>

    </div>
  </footer>
</template>
