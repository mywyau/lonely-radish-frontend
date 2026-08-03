export const siteName = 'Lonely Radish'

export const defaultSeoDescription =
  'Meet compatible people nearby through shared interests, clear availability and date plans you both agree.'

export type PublicSeo = {
  title: string
  description: string
}

export const publicSeoByPath: Readonly<Record<string, PublicSeo>> = Object.freeze({
  '/': {
    title: 'Intentional dating built around real plans',
    description: 'Meet compatible people nearby through shared interests, clear availability and date plans you both agree. Lonely Radish is a UK dating app for intentional dating.',
  },
  '/faq': {
    title: 'How Lonely Radish works',
    description: 'Learn how interests, match limits, date planning, rescheduling, privacy and safety work on Lonely Radish.',
  },
  '/upgrade': {
    title: 'Membership plans and features',
    description: 'Compare Lonely Radish dating membership options, active match limits and features before choosing a paid plan.',
  },
  '/contact': {
    title: 'Contact Lonely Radish',
    description: 'Contact the Lonely Radish team with a question, support request, product issue or feedback about the dating app.',
  },
  '/terms-of-service': {
    title: 'Terms of Service',
    description: 'Read the terms that govern accounts, subscriptions, acceptable behaviour and use of the Lonely Radish dating app.',
  },
  '/acceptable-use': {
    title: 'Acceptable Use Policy',
    description: 'Read the safety and conduct rules for profiles, dates and interactions on the Lonely Radish dating app.',
  },
  '/law-enforcement-guidelines': {
    title: 'Law Enforcement Guidelines',
    description: 'Information for authorised UK law enforcement and government agencies requesting data from Lonely Radish.',
  },
  '/privacy-notice': {
    title: 'Privacy Notice',
    description: 'Learn what personal data Lonely Radish collects, why it is used, how it is protected and what rights you have.',
  },
  '/refund-policy': {
    title: 'Refund Policy',
    description: 'Read how cancellations and refund requests are handled for Lonely Radish dating app subscriptions.',
  },
})

export function normaliseSeoPath(path: string): string {
  const withoutTrailingSlash = path.replace(/\/+$/, '')
  return withoutTrailingSlash || '/'
}

export function publicSeoForPath(path: string): PublicSeo | null {
  return publicSeoByPath[normaliseSeoPath(path)] || null
}

export function isIndexablePath(path: string): boolean {
  return publicSeoForPath(path) !== null
}
