begin;

alter table business_offers add column if not exists archived_at timestamptz;
alter table business_offers add column if not exists submitted_at timestamptz;
alter table business_offers add column if not exists revision integer not null default 1;
update business_offers set submitted_at=created_at where submitted_at is null;
alter table business_offers drop constraint if exists business_offers_approval_status_check;
alter table business_offers add constraint business_offers_approval_status_check
  check (approval_status in ('draft','pending','approved','rejected','archived'));
alter table business_offers drop constraint if exists business_offers_revision_check;
alter table business_offers add constraint business_offers_revision_check check (revision>0);

alter table business_venues add column if not exists rejection_note text;
alter table business_venues add column if not exists archived_at timestamptz;
alter table business_venues add column if not exists submitted_at timestamptz;
alter table business_venues add column if not exists revision integer not null default 1;
update business_venues set submitted_at=created_at where submitted_at is null;
alter table business_venues drop constraint if exists business_venues_status_check;
alter table business_venues drop constraint if exists business_venues_status_check1;
alter table business_venues add constraint business_venues_status_check
  check (status in ('draft','pending','active','paused','rejected','archived'));
-- Paused previously represented an administrator rejection; keep the distinct
-- paused state available for future operational controls.
update business_venues set status='rejected' where status='paused' and reviewed_at is not null;
alter table business_venues drop constraint if exists business_venues_rejection_note_check;
alter table business_venues add constraint business_venues_rejection_note_check
  check (rejection_note is null or char_length(rejection_note)<=500);
alter table business_venues drop constraint if exists business_venues_revision_check;
alter table business_venues add constraint business_venues_revision_check check (revision>0);

create table if not exists business_submission_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  entity_type text not null check (entity_type in ('venue','offer')),
  entity_id uuid not null,
  revision integer not null check (revision>0),
  action text not null check (action in ('material_edit','operational_edit','resubmit','archive')),
  changed_by text not null references users(id) on delete restrict,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists business_submission_versions_entity_idx
  on business_submission_versions(entity_type,entity_id,revision desc);
create unique index if not exists business_submission_versions_revision_uidx
  on business_submission_versions(entity_type,entity_id,revision);

alter table business_submission_versions enable row level security;
do $$ begin
  revoke all on table business_submission_versions from anon,authenticated;
exception when undefined_object then null;
end $$;

commit;
