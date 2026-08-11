begin;

alter table daily_interests
  drop constraint if exists daily_interests_resolution_check;
alter table daily_interests
  add constraint daily_interests_resolution_check check (
    (resolution is null and resolved_at is null)
    or (resolution in ('accepted','passed','expired','withdrawn','blocked') and resolved_at is not null)
  );

alter table reports
  add column if not exists related_interest_id uuid references daily_interests(id) on delete set null;

create index if not exists reports_related_interest_idx
  on reports(related_interest_id)
  where related_interest_id is not null;

commit;
