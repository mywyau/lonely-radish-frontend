begin;

alter table date_proposals add column if not exists selected_time_id uuid references proposal_times(id) on delete set null;
alter table date_proposals add column if not exists confirmed_at timestamptz;

create index if not exists date_proposals_match_latest_idx on date_proposals(match_id, created_at desc);

commit;
