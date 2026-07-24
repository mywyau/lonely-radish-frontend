import { getUserEntitlement } from '~/server/utils/getEntitlement'
import { hasPaidAccess } from '~/utils/paidAccess'

export async function getActiveMatchLimit(userId: string) {
  return hasPaidAccess(await getUserEntitlement(userId)) ? 5 : 3
}
