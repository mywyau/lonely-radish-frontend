begin;

-- Active and queued matches are the only rows needed by the live dashboard.
-- Partial participant indexes keep historical unmatched/blocked rows out of this
-- hot path and support the endpoint's two-branch UNION ALL lookup.
create index if not exists matches_live_user_one_idx
  on matches(user_one_id,matched_at desc)
  where status in ('active','queued');

create index if not exists matches_live_user_two_idx
  on matches(user_two_id,matched_at desc)
  where status in ('active','queued');

-- The dashboard retrieves only the newest non-revoked claim for a proposal.
create index if not exists business_offer_claims_live_proposal_idx
  on business_offer_claims(proposal_id,claimed_at desc)
  where proposal_id is not null and status<>'revoked';

commit;
