begin;

-- Preserve historical claims while resolving any duplicate offer/date pairs
-- created before the couple-wide rule existed. A redeemed claim wins.
with ranked as (
  select id,row_number() over (
    partition by offer_id,proposal_id
    order by (status='redeemed') desc,claimed_at desc,id
  ) as position
  from business_offer_claims
  where proposal_id is not null
)
update business_offer_claims claim
set proposal_id=null
from ranked
where claim.id=ranked.id and ranked.position>1;

alter table business_offer_claims
  drop constraint if exists business_offer_claims_offer_id_claimant_user_id_key;

create unique index if not exists business_offer_claims_offer_proposal_unique
  on business_offer_claims(offer_id,proposal_id)
  where proposal_id is not null;

commit;
