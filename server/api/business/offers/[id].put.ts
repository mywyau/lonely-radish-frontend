import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireBusiness } from '~/server/utils/requireBusiness'
import { boolean, objectBody } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  const id = getRouterParam(event, 'id')
  const active = boolean(objectBody(await readBody(event)).active, 'Active')
  const { rows } = await db.query(`update business_offers set active=$3,updated_at=now()
    where id=$1 and business_id=$2 returning id,active`, [id,business.id,active])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Offer not found' })
  return rows[0]
})
