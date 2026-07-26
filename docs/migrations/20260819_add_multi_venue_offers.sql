begin;

-- An offer is a campaign. It can target its original venue, an explicit set of
-- venues, or every current and future venue owned by the business.
alter table business_offers add column if not exists venue_scope text not null default 'single';
alter table business_offers drop constraint if exists business_offers_venue_scope_check;
alter table business_offers add constraint business_offers_venue_scope_check
  check (venue_scope in ('single','selected','all'));

-- Composite uniqueness lets the junction table enforce that an offer and venue
-- always belong to the same business, even if a server-side check is missed.
create unique index if not exists business_offers_id_business_uidx
  on business_offers(id,business_id);
create unique index if not exists business_venues_id_business_uidx
  on business_venues(id,business_id);
alter table business_offers add constraint business_offers_venue_business_fk
  foreign key (venue_id,business_id) references business_venues(id,business_id) on delete cascade;

create table if not exists business_offer_venues (
  offer_id uuid not null,
  business_id uuid not null,
  venue_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (offer_id,venue_id),
  constraint business_offer_venues_offer_business_fk
    foreign key (offer_id,business_id) references business_offers(id,business_id) on delete cascade,
  constraint business_offer_venues_venue_business_fk
    foreign key (venue_id,business_id) references business_venues(id,business_id) on delete cascade
);
create index if not exists business_offer_venues_business_venue_idx
  on business_offer_venues(business_id,venue_id,offer_id);

-- Preserve every existing offer as a single-location campaign.
insert into business_offer_venues(offer_id,business_id,venue_id)
select id,business_id,venue_id from business_offers
on conflict (offer_id,venue_id) do nothing;

-- A multi-location claim is not tied to a branch until it is consumed. Keeping
-- the actual branch on the claim makes venue reporting and audits accurate.
alter table business_offer_claims add column if not exists redeemed_venue_id uuid
  references business_venues(id) on delete restrict;
update business_offer_claims c
set redeemed_venue_id=o.venue_id
from business_offers o
where c.offer_id=o.id and c.status='redeemed' and c.redeemed_venue_id is null;
create index if not exists business_offer_claims_redeemed_venue_idx
  on business_offer_claims(redeemed_venue_id,redeemed_at desc)
  where status='redeemed';

alter table business_offer_venues enable row level security;
do $$ begin
  revoke all on table business_offer_venues from anon,authenticated;
exception when undefined_object then null;
end $$;

commit;
