<script setup lang="ts">
import { CalendarDays, HeartHandshake, HelpCircle, ShieldCheck, Sparkles, UserRound } from '@lucide/vue'

definePageMeta({ title: 'How Lonely Radish works · FAQ' })

const sections = [
  {
    title: 'Getting started',
    description: 'Who can join and what you’ll need to get going.',
    icon: UserRound,
    questions: [
      {
        question: 'Who can use Lonely Radish?',
        answer: 'Lonely Radish is for adults aged 18 or over who would like to meet someone new over a casual activity in a public place.',
      },
      {
        question: 'What do I need to complete my profile?',
        answer: 'We’ll ask for some basic details, what you’re interested in, your dating preferences and an approximate UK location. A profile photo and regular availability are helpful but optional, and you can add them later. We never ask for your home address.',
      },
      {
        question: 'Why does the app ask about activities and availability?',
        answer: 'Having an activity in mind makes it easier to suggest a first date. Sharing when you’re usually free also helps someone choose a time that might actually work. You can change both later.',
      },
    ],
  },
  {
    title: 'Discovery and matching',
    description: 'How interests become matches, and why there are limits.',
    icon: Sparkles,
    questions: [
      {
        question: 'How many people can I show interest in?',
        answer: 'You can show interest in up to five people each day. The idea is to choose people you’re genuinely curious about, rather than work through an endless queue.',
      },
      {
        question: 'When does an interest become a match?',
        answer: 'The person you choose can see your interest and decide whether to accept or pass. If you’ve both independently shown interest, you’ll match automatically.',
      },
      {
        question: 'How long does an interest last?',
        answer: 'Someone has 14 days to respond to your interest. You can take it back before they accept it. If there is no response, it closes quietly without sending either person an alert. Your histories explain whether you were still waiting, took it back or reached the end of the 14 days. Once an interest closes, it cannot be sent again to the same person.',
      },
      {
        question: 'Why can I receive only five interests at a time?',
        answer: 'The limit gives you a small group to consider without an endless queue. When five people are waiting, your profile pauses incoming interest. Passing is final and new interest does not replace that person immediately. You can still choose people yourself, and a mutual interest can become a direct match.',
      },
      {
        question: 'How do active match limits work?',
        answer: 'Everyone can have up to five active matches. Each active connection uses one space throughout matching, planning and a confirmed date; those stages do not use separate spaces. A waiting match does not count until you activate it. Paying never changes your visibility, ranking or ability to meet and make a plan.',
      },
      {
        question: 'Can I browse without appearing in discovery?',
        answer: 'Yes. Turn on “Only people I choose” in your account controls. You can browse normally, but your profile appears only after you show interest in someone. Existing interests, matches and plans keep working. This privacy option is available to everyone and is separate from pausing your profile.',
      },
      {
        question: 'What happens when I accept an interest?',
        answer: 'You create a new connection and can start making a date plan. If you had already chosen each other, the connection happens automatically.',
      },
      {
        question: 'Why can I accept only one interest at a time?',
        answer: 'When you accept someone’s interest, take a moment to act on that match before accepting another. Start making a plan, or close the match if you change your mind. This rule applies one match at a time; it is not a daily or lifetime limit, and mutual matches are unaffected.',
      },
      {
        question: 'What happens when a match is waiting?',
        answer: 'If either person’s connection list is full, the new connection waits until you both have room. It stays visible under “Waiting to start” and does not use an active space.',
      },
      {
        question: 'Can I remove a match?',
        answer: 'Yes. Removing a match ends the connection. If you ended it, you may later send one respectful note and ask to reconnect once. The other person does not have to respond or accept. If they ended it, you cannot reopen it from your side. Blocking goes further: neither of you will be shown to the other while the block remains in place.',
      },
    ],
  },
  {
    title: 'Planning a date',
    description: 'From the first suggestion to a plan you’ve both agreed.',
    icon: CalendarDays,
    questions: [
      {
        question: 'How does a date proposal work?',
        answer: 'One person suggests what to do, a time and a public place to meet. The other can accept, decline or suggest something different. It only becomes a confirmed date when you both agree.',
      },
      {
        question: 'What happens when someone proposes a reschedule?',
        answer: 'Your original date stays confirmed while the other person considers the new suggestion. It changes only if they accept the replacement.',
      },
      {
        question: 'How is cancelling different from rescheduling?',
        answer: 'Rescheduling says “I still want to meet, but can we change the plan?” Cancelling ends the date and tells the other person straight away. You’ll remain matched, so you can make another plan later if you both want to.',
      },
      {
        question: 'Can I edit a confirmed date directly?',
        answer: 'No. Use “Propose a different date” instead. Your existing plan will stay visible until the other person accepts the change, so there is no confusion about when or where you’re meeting.',
      },
      {
        question: 'Will I receive reminders?',
        answer: 'Yes. We can remind you before a confirmed date and ask whether you’re still going. You can manage email notifications from your account.',
      },
    ],
  },
  {
    title: 'Privacy and safety',
    description: 'What you share, where to meet and what to do if something feels wrong.',
    icon: ShieldCheck,
    questions: [
      {
        question: 'Do I have to share my contact details?',
        answer: 'No. You can make and manage the whole plan inside Lonely Radish. If you do add contact details, you choose whether to share them with active matches. Never put private contact details or a home address in the venue fields.',
      },
      {
        question: 'What kind of venue should I choose?',
        answer: 'Choose somewhere public and easy to recognise. Add the entrance, station exit or nearby landmark if that will help you find each other.',
      },
      {
        question: 'What should I do if a person makes me uncomfortable?',
        answer: 'You can block or report someone from their profile. Blocking stops further contact, while a report goes to the moderation team. If their profile is no longer available, contact support and include any details you have. Lonely Radish is not an emergency service.',
      },
      {
        question: 'What happens after a date?',
        answer: 'First, we privately ask whether the date happened. We then ask whether you would like another date. Your choice and optional note stay hidden until both people answer, so neither person is influenced by the other. If you both choose another date, the connection stays open; if either person chooses no, it closes. Cancelling in advance is treated differently from not turning up.',
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
        <h1 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Questions about how Lonely Radish works?</h1>
        <p class="mt-4 max-w-2xl leading-7 text-white/75">Here are the answers to the things people are most likely to wonder about, from matching to changing a date.</p>
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

      <section class="mt-10 rounded-xl bg-[#EAF2DE] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><div class="flex items-center gap-2"><HeartHandshake class="size-5 text-[#52713A]" /><h2 class="text-xl font-semibold">Still have a question?</h2></div><p class="mt-2 text-sm leading-6 text-[#4D2F39]">Tell us what was unclear or what you would like the app to explain better.</p></div>
        <NuxtLink to="/contact" class="mt-4 inline-flex rounded-lg bg-[#52713A] px-5 py-3 text-sm font-semibold text-white sm:mt-0">Contact us</NuxtLink>
      </section>
    </div>
  </main>
</template>
