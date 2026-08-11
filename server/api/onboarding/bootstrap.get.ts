import { setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { loadOnboardingBootstrap } from '~/server/services/onboardingBootstrap'
import { requireUser } from '~/server/utils/requireUser'
import type { OnboardingBootstrapResponse } from '~/types/api/onboarding'

export default defineEventHandler(async (event): Promise<OnboardingBootstrapResponse> => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  return withDatabaseClient(database => loadOnboardingBootstrap(database, sub))
})
