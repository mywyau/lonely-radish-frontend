import { getUserEntitlement } from '~/server/utils/getEntitlement'
import { db, type DatabaseQueryable } from '~/server/repositories/db'
import { hasPaidAccess } from '~/utils/paidAccess'

export async function getActiveMatchLimit(userId: string, database: DatabaseQueryable = db) {
  return hasPaidAccess(await getUserEntitlement(userId, database)) ? 5 : 3
}
