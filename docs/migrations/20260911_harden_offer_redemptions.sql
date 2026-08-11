begin;

-- Limits live on the campaign so they remain durable across deployments and
-- cannot be bypassed by calling the API from another device.
alter table business_offers
  add column if not exists redemption_limit_total integer;
alter table business_offers
  add column if not exists redemption_limit_per_user integer not null default 1;
alter table business_offers drop constraint if exists business_offers_redemption_limit_total_check;
alter table business_offers add constraint business_offers_redemption_limit_total_check
  check (redemption_limit_total is null or redemption_limit_total between 1 and 1000000);
alter table business_offers drop constraint if exists business_offers_redemption_limit_per_user_check;
alter table business_offers add constraint business_offers_redemption_limit_per_user_check
  check (redemption_limit_per_user between 1 and 100);

-- A successful retry presents the same key and receives the original result.
-- A different key cannot replay an already-consumed claim code.
alter table business_offer_claims
  add column if not exists redemption_idempotency_key uuid;
create unique index if not exists business_offer_claims_redemption_idempotency_uidx
  on business_offer_claims(redemption_idempotency_key)
  where redemption_idempotency_key is not null;

create index if not exists business_offer_claims_offer_redeemed_idx
  on business_offer_claims(offer_id,redeemed_at desc)
  where status='redeemed';
create index if not exists business_offer_claims_offer_user_redeemed_idx
  on business_offer_claims(offer_id,claimant_user_id,redeemed_at desc)
  where status='redeemed';

commit;
