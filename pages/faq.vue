<script setup lang="ts">
import { CalendarDays, HeartHandshake, HelpCircle, ShieldCheck, Sparkles, UserRound } from '@lucide/vue'

definePageMeta({ title: 'How Lonely Radish works · FAQ' })
useSeoMeta({
  title: 'How Lonely Radish works · FAQ',
  description: 'Understand discovery, matching, date planning, rescheduling, privacy and safety on Lonely Radish.',
  ogTitle: 'How Lonely Radish works · FAQ',
  ogDescription: 'The rules and features behind more intentional matching and clearer date plans.',
})

const sections = [
  {
    title: 'Getting started',
    description: 'Who the app is for and what you need before discovery.',
    icon: UserRound,
    questions: [
      {
        question: 'Who can use Lonely Radish?',
        answer: 'Lonely Radish is for adults aged 18 or over who are open to meeting new people through casual, public activity dates.',
      },
      {
        question: 'What do I need to complete my profile?',
        answer: 'You need the core profile details, your preferences and interests, usual availability, an approximate UK location and at least one profile photo. Your exact private address is not requested for discovery.',
      },
      {
        question: 'Why does the app ask about activities and availability?',
        answer: 'Activities provide a natural reason to meet, while your usual availability helps another person propose a realistic time. You can update both from your account.',
      },
    ],
  },
  {
    title: 'Discovery and matching',
    description: 'The limits that make discovery more selective.',
    icon: Sparkles,
    questions: [
      {
        question: 'How many people can I show interest in?',
        answer: 'You can show interest in up to five people per day. The limit is intentional: it encourages considered choices rather than an unlimited swipe queue.',
      },
      {
        question: 'When does an interest become a match?',
        answer: 'If you have both already shown interest, the match can form automatically. Otherwise, the recipient can review the interest and choose whether to accept it.',
      },
      {
        question: 'Why is there an active match limit?',
        answer: 'A smaller active list keeps attention on conversations and plans that can realistically move forward. The exact limit depends on your plan, and additional matches can wait until space becomes available.',
      },
      {
        question: 'Can I remove a match?',
        answer: 'Yes. Removing a match closes that connection. Blocking is a separate safety control and prevents either person from appearing to the other.',
      },
    ],
  },
  {
    title: 'Planning a date',
    description: 'How proposals become clear, mutually agreed plans.',
    icon: CalendarDays,
    questions: [
      {
        question: 'How does a date proposal work?',
        answer: 'One person suggests an activity, one future time and a public venue. The other person can accept it, decline it or suggest different details. The date is confirmed only after acceptance.',
      },
      {
        question: 'What happens when someone proposes a reschedule?',
        answer: 'The currently confirmed date remains the agreed plan while the replacement is reviewed. The new time and venue replace it only when the other person accepts them.',
      },
      {
        question: 'How is cancelling different from rescheduling?',
        answer: 'Rescheduling means you still want to meet and are proposing a replacement plan. Cancelling ends the confirmed date immediately, notifies the other person and leaves the match open so you can plan again later.',
      },
      {
        question: 'Can I edit a confirmed date directly?',
        answer: 'No. Confirmed details should not change silently. Use “Propose a different date” so the existing agreement stays visible and the other person can explicitly accept the replacement.',
      },
      {
        question: 'Will I receive reminders?',
        answer: 'The app can send reminders before a confirmed date and lets each person confirm that they are still going. Notification preferences can be managed from your account.',
      },
    ],
  },
  {
    title: 'Privacy and safety',
    description: 'Controls for meeting with clearer boundaries.',
    icon: ShieldCheck,
    questions: [
      {
        question: 'Do I have to share my contact details?',
        answer: 'No. Contact sharing is optional, and the planning journey can remain inside Lonely Radish. Do not put private contact or home-address information into public venue details.',
      },
      {
        question: 'What kind of venue should I choose?',
        answer: 'Choose a recognisable public place and add only the meeting details needed to find each other, such as the entrance or nearby landmark.',
      },
      {
        question: 'What should I do if a person makes me uncomfortable?',
        answer: 'You can block or report them from their profile and relevant date surfaces. Blocking prevents further interaction; reports are sent for moderation review. Lonely Radish is not an emergency service.',
      },
      {
        question: 'What happens after a date?',
        answer: 'Each person can privately record whether the date happened and whether they would meet again. Reliability controls distinguish a clear cancellation from a reported no-show.',
      },
    ],
  },
]
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8 sm:py-14">
    <div class="mx-auto max-w-4xl">
      <header class="rounded-xl bg-[#2A1520] p-7 text-white sm:p-10">
        <p class="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#F7B7C4]"><HelpCircle class="size-4" />How it works</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Rules, features and frequently asked questions</h1>
        <p class="mt-4 max-w-2xl leading-7 text-white/75">Lonely Radish is designed around selective discovery, mutually agreed plans and clear follow-through. Here is what that means in practice.</p>
      </header>

      <nav class="mt-5 flex flex-wrap gap-2" aria-label="FAQ sections">
        <a v-for="section in sections" :key="section.title" :href="`#${section.title.toLowerCase().replaceAll(' ', '-')}`" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#8F1839] shadow-sm">{{ section.title }}</a>
      </nav>

      <div class="mt-8 grid gap-8">
        <section v-for="section in sections" :id="section.title.toLowerCase().replaceAll(' ', '-')" :key="section.title" class="scroll-mt-24">
          <div class="flex items-start gap-3">
            <span class="rounded-lg bg-[#FCE3E8] p-2 text-[#B4234A]"><component :is="section.icon" class="size-5" aria-hidden="true" /></span>
            <div><h2 class="text-2xl font-semibold">{{ section.title }}</h2><p class="mt-1 text-sm text-[#6E4D58]">{{ section.description }}</p></div>
          </div>
          <div class="mt-4 overflow-hidden rounded-xl border border-[#E8D8C4] bg-white">
            <details v-for="question in section.questions" :key="question.question" class="group border-b border-[#E8D8C4] p-5 last:border-b-0">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold marker:content-none">
                {{ question.question }}
                <span class="text-xl text-[#B4234A] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-[#6E4D58]">{{ question.answer }}</p>
            </details>
          </div>
        </section>
      </div>

      <!-- <section class="mt-10 rounded-xl bg-[#EAF2DE] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><div class="flex items-center gap-2"><HeartHandshake class="size-5 text-[#52713A]" /><h2 class="text-xl font-semibold">Still have a question?</h2></div><p class="mt-2 text-sm leading-6 text-[#4D2F39]">Tell us what was unclear or what you would like the app to explain better.</p></div>
        <NuxtLink to="/contact" class="mt-4 inline-flex rounded-lg bg-[#52713A] px-5 py-3 text-sm font-semibold text-white sm:mt-0">Contact us</NuxtLink>
      </section> -->
    </div>
  </main>
</template>
