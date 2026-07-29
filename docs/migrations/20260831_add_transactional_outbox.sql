begin;

create table if not exists outbox_events (
  id bigserial primary key,
  event_type text not null check (char_length(event_type) between 1 and 100),
  aggregate_type text not null check (char_length(aggregate_type) between 1 and 80),
  aggregate_id text not null check (char_length(aggregate_id) between 1 and 200),
  deduplication_key text not null unique check (char_length(deduplication_key) between 1 and 400),
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','processing','processed','failed','dead')),
  attempts smallint not null default 0 check (attempts between 0 and 20),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists outbox_events_available_idx
  on outbox_events(available_at,id)
  where status in ('pending','failed');

create index if not exists outbox_events_processing_lease_idx
  on outbox_events(locked_at)
  where status='processing';

create index if not exists outbox_events_retention_idx
  on outbox_events(processed_at)
  where status='processed';

create index if not exists outbox_events_dead_idx
  on outbox_events(created_at)
  where status='dead';

alter table notifications
  add column if not exists source_outbox_event_id bigint
    references outbox_events(id) on delete set null;

create unique index if not exists notifications_outbox_recipient_unique
  on notifications(source_outbox_event_id,recipient_id)
  where source_outbox_event_id is not null;

alter table outbox_events enable row level security;

do $$ begin
  revoke all on table outbox_events from anon, authenticated;
  revoke all on sequence outbox_events_id_seq from anon, authenticated;
exception when undefined_object then null;
end $$;

commit;
