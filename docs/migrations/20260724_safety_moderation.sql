begin;

create index if not exists blocks_blocked_blocker_idx on blocks(blocked_id, blocker_id);
create index if not exists reports_status_created_idx on reports(status, created_at desc);
create index if not exists reports_reported_created_idx on reports(reported_id, created_at desc);

alter table reports add column if not exists priority smallint not null default 3 check (priority between 1 and 5);
alter table reports add column if not exists related_match_id uuid references matches(id) on delete set null;
alter table reports add column if not exists reviewed_at timestamptz;
alter table reports add column if not exists resolution text check (resolution is null or char_length(resolution) <= 1000);

commit;
