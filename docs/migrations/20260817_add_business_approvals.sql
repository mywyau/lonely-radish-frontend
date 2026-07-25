begin;

alter table businesses add column if not exists reviewed_by text references users(id) on delete set null;
alter table businesses add column if not exists reviewed_at timestamptz;
alter table business_venues add column if not exists reviewed_by text references users(id) on delete set null;
alter table business_venues add column if not exists reviewed_at timestamptz;

alter table business_offers add column if not exists approval_status text not null default 'pending';
alter table business_offers add column if not exists reviewed_by text references users(id) on delete set null;
alter table business_offers add column if not exists reviewed_at timestamptz;
alter table business_offers add column if not exists rejection_note text;
alter table business_offers drop constraint if exists business_offers_approval_status_check;
alter table business_offers add constraint business_offers_approval_status_check
  check (approval_status in ('pending','approved','rejected'));
alter table business_offers drop constraint if exists business_offers_rejection_note_check;
alter table business_offers add constraint business_offers_rejection_note_check
  check (rejection_note is null or char_length(rejection_note) <= 500);

create index if not exists business_offers_public_idx
  on business_offers(approval_status,active,created_at desc);

create table if not exists admin_review_events (
  id uuid primary key default gen_random_uuid(),
  reviewer_id text not null references users(id) on delete restrict,
  entity_type text not null check (entity_type in ('business','venue','offer')),
  entity_id uuid not null,
  decision text not null check (decision in ('pending','approved','rejected')),
  note text,
  created_at timestamptz not null default now(),
  check (note is null or char_length(note) <= 500)
);
create index if not exists admin_review_events_entity_idx
  on admin_review_events(entity_type,entity_id,created_at desc);

alter table admin_review_events enable row level security;
do $$ begin
  revoke all on table admin_review_events from anon,authenticated;
exception when undefined_object then null;
end $$;

commit;
