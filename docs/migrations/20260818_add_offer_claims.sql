begin;

create table if not exists business_offer_claims (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references business_offers(id) on delete cascade,
  claimant_user_id text not null references users(id) on delete cascade,
  proposal_id uuid references date_proposals(id) on delete set null,
  token_version integer not null default 1 check (token_version > 0),
  code_digest bytea not null unique check (octet_length(code_digest)=32),
  status text not null default 'issued' check (status in ('issued','redeemed','revoked')),
  offer_title text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  terms text,
  business_name text not null,
  venue_name text not null,
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by_user_id text references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (offer_id,claimant_user_id),
  check (char_length(offer_title) between 2 and 120),
  check (char_length(business_name) between 2 and 120),
  check (char_length(venue_name) between 2 and 120),
  check (terms is null or char_length(terms) <= 500),
  check (discount_type<>'percentage' or discount_value<=100),
  check (expires_at>claimed_at),
  check ((status='redeemed')=(redeemed_at is not null))
);

create index if not exists business_offer_claims_claimant_idx
  on business_offer_claims(claimant_user_id,claimed_at desc);
create index if not exists business_offer_claims_offer_status_idx
  on business_offer_claims(offer_id,status);
create index if not exists business_offer_claims_proposal_idx
  on business_offer_claims(proposal_id) where proposal_id is not null;
create index if not exists business_offer_claims_redeemed_idx
  on business_offer_claims(redeemed_at desc) where status='redeemed';

drop trigger if exists business_offer_claims_set_updated_at on business_offer_claims;
create trigger business_offer_claims_set_updated_at before update on business_offer_claims
  for each row execute function set_updated_at();

alter table business_offer_claims enable row level security;
do $$ begin
  revoke all on table business_offer_claims from anon,authenticated;
exception when undefined_object then null;
end $$;

commit;