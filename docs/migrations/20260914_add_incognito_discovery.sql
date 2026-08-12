begin;

alter table users
  add column if not exists discovery_mode text not null default 'standard';

alter table users drop constraint if exists users_discovery_mode_check;
alter table users add constraint users_discovery_mode_check
  check (discovery_mode in ('standard','incognito'));

-- Supports "this incognito candidate chose the viewer" without scanning the
-- interest history. Resolved rows remain available for direct safety access via
-- the existing unique sender/recipient index.
create index if not exists daily_interests_active_recipient_sender_idx
  on daily_interests(recipient_id,sender_id)
  where resolved_at is null;

commit;
