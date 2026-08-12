import { createError, readBody, setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { objectBody, text } from "~/server/utils/productValidation";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireBusiness } from "~/server/utils/requireBusiness";

const categories = new Set([
  "cafe",
  "restaurant",
  "bar",
  "activity",
  "culture",
  "wellness",
  "other",
]);
const managingRoles = new Set(["owner", "manager"]);

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store");
  const business = await requireBusiness(event);
  if (business.status !== "active") {
    throw createError({
      statusCode: 403,
      statusMessage: "Business approval is required before adding more venues",
    });
  }
  if (!managingRoles.has(business.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Owner or manager access is required to add venues",
    });
  }
  await enforceRateLimit(
    `rl:business-venue-create:${business.id}:${business.userId}`,
    30,
    60 * 60,
  );

  const body = objectBody(await readBody(event));
  const name = text(body.name, "Venue name", 120, true)!;
  const category = text(body.category, "Venue category", 30, true)!;
  const addressLine = text(body.addressLine, "Venue address", 200, true)!;
  const city = text(body.city, "City", 100, true)!;
  const postcode = text(body.postcode, "Postcode", 16, true)!;
  if (name.length < 2)
    throw createError({
      statusCode: 400,
      statusMessage: "Venue name must be at least 2 characters",
    });
  if (!categories.has(category))
    throw createError({
      statusCode: 400,
      statusMessage: "Choose a valid venue category",
    });

  const normalizedPostcode = postcode.toUpperCase();
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `business-venue:${business.id}`,
    ]);
    const duplicate = await client.query(
      `select 1 from business_venues
      where business_id=$1 and lower(name)=lower($2)
        and replace(upper(postcode),' ','')=replace(upper($3),' ','') limit 1`,
      [business.id, name, normalizedPostcode],
    );
    if (duplicate.rows[0]) {
      throw createError({
        statusCode: 409,
        statusMessage: "A venue with this name and postcode already exists",
      });
    }
    const { rows } = await client.query(
      `insert into business_venues
      (business_id,name,category,address_line,city,postcode,submitted_at)
      values($1,$2,$3,$4,$5,$6,now())
      returning id,name,category,address_line as "addressLine",city,postcode,status`,
      [business.id, name, category, addressLine, city, normalizedPostcode],
    );
    await client.query("commit");
    return { venue: rows[0] };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});
