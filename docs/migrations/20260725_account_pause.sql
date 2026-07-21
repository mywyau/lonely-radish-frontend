begin;

alter table users add column if not exists paused_at timestamptz;
alter table users add column if not exists paused_until timestamptz;
create index if not exists users_discovery_status_idx on users(account_status, paused_until);

commit;
