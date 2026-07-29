begin;

alter table date_proposals
  add column if not exists venue_address text,
  add column if not exists venue_postcode text,
  add column if not exists public_venue_confirmed_at timestamptz;

alter table date_proposals
  drop constraint if exists date_proposals_venue_address_check,
  add constraint date_proposals_venue_address_check check (
    venue_address is null or char_length(venue_address) between 1 and 300
  ),
  drop constraint if exists date_proposals_venue_postcode_check,
  add constraint date_proposals_venue_postcode_check check (
    venue_postcode is null or venue_postcode ~ '^(GIR 0AA|[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2})$'
  );

commit;
