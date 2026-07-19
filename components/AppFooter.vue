<template>
  <footer class="mt-12 border-t border-[#E8D8C4] bg-[#FBF7F1]">
    <div class="max-w-5xl mx-auto px-5 py-8 text-sm text-[#2A1520]">

      <!-- Brand -->
      <div class="text-center sm:text-left">
        <NuxtLink to="/" class="font-semibold text-lg text-black hover:text-gray-600">
          Lonely Radish
        </NuxtLink>

        <p class="mt-2 text-[#6E4D58] text-sm sm:max-w-sm">
          Casual dates to meet new people and have fun.
        </p>
      </div>

      <!-- Links -->
      <div class="mt-6 grid grid-cols-1 gap-3 text-center text-sm min-[360px]:grid-cols-2 min-[360px]:text-left sm:mt-4 sm:flex sm:flex-row sm:justify-end sm:gap-6">

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
