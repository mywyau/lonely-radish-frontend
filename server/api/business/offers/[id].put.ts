import { createError, getRouterParam, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { setBusinessOfferActive } from "~/server/services/businessOfferPublication";
import { requireBusiness } from "~/server/utils/requireBusiness";
import { boolean, objectBody } from "~/server/utils/productValidation";

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event);
  if (business.role !== "owner" && business.role !== "manager") {
    throw createError({
      statusCode: 403,
      statusMessage: "Owner or manager access is required to manage campaigns",
    });
  }
  const id = getRouterParam(event, "id");
  const active = boolean(objectBody(await readBody(event)).active, "Active");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Invalid offer" });
  return setBusinessOfferActive(db, { offerId: id, businessId: business.id, active });
});
