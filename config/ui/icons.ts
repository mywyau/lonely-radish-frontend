// config/ui/icons.ts

export const appIcons = {
  home: 'lucide:house',
  settings: 'lucide:settings',
  close: 'lucide:x',
  back: 'lucide:arrow-left',
  menu: 'lucide:menu',

  audio: 'lucide:volume-2',
  muted: 'lucide:volume-x',
  maleVoice: 'lucide:user',
  femaleVoice: 'lucide:user-round',

  quiz: 'lucide:circle-help',
  dailyQuiz: 'lucide:calendar-check',
  jyutping: 'lucide:audio-lines',
  speaking: 'lucide:mic',
  listening: 'lucide:headphones',
  writing: 'lucide:pencil-line',
  reading: 'lucide:book-open',

  xp: 'lucide:sparkles',
  streak: 'lucide:flame',
  mastery: 'lucide:trophy',
  locked: 'lucide:lock-keyhole',
  unlocked: 'lucide:unlock-keyhole',
  taroKey: 'lucide:key-round',

  dojo: 'lucide:target',
  levels: 'lucide:layers',
  topic: 'lucide:tags',
  progress: 'lucide:chart-no-axes-column-increasing',

  success: 'lucide:circle-check',
  warning: 'lucide:triangle-alert',
  error: 'lucide:circle-x',
  info: 'lucide:info',
} as const

export type AppIconName = keyof typeof appIcons