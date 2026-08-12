import { MEMBER_ACTIVE_MATCH_LIMIT } from './memberLimits'

export async function getActiveMatchLimit(_userId: string, _database?: unknown) {
  return MEMBER_ACTIVE_MATCH_LIMIT
}
