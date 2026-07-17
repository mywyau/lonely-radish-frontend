<template>
  <footer class="mt-12 border-t border-[#F2C8D0] bg-[#FFF6F7]">
    <div class="max-w-5xl mx-auto px-5 py-8 text-sm text-[#2A1520]">

      <!-- Brand -->
      <div class="text-center sm:text-left">
        <NuxtLink to="/" class="font-semibold text-lg text-[#B4234A] hover:text-[#8F1839]">
          Lonely Radish
        </NuxtLink>

        <p class="mt-2 text-[#6E4D58] text-sm sm:max-w-sm">
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
      </div>

      <!-- Copyright -->
      <div class="mt-8 text-center text-xs text-[#7C5963]">
        © {{ new Date().getFullYear() }} Lonely Radish
      </div>

    </div>
  </footer>
</template>
