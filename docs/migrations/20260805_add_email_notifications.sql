begin;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'interest_received','new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed','match_apology'
));

create table if not exists email_notification_preferences (
  user_id text primary key references users(id) on delete cascade,
  interests boolean not null default true,
  matches boolean not null default true,
  date_plans boolean not null default true,
  follow_ups boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now()
);

create table if not exists email_deliveries (
  id bigserial primary key,
  notification_id uuid not null unique references notifications(id) on delete cascade,
  recipient_id text not null references users(id) on delete cascade,
  kind text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','skipped')),
  attempts smallint not null default 0,
  provider_id text,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists email_deliveries_pending_idx
  on email_deliveries(next_attempt_at, id) where status in ('pending','failed');

create or replace function queue_notification_email() returns trigger language plpgsql as $$
begin
  insert into email_notification_preferences(user_id) values(new.recipient_id)
    on conflict(user_id) do nothing;
  insert into email_deliveries(notification_id,recipient_id,kind)
    values(new.id,new.recipient_id,new.kind) on conflict(notification_id) do nothing;
  return new;
end $$;

drop trigger if exists notifications_queue_email on notifications;
create trigger notifications_queue_email after insert on notifications
  for each row execute function queue_notification_email();

alter table email_notification_preferences enable row level security;
alter table email_deliveries enable row level security;

do $$ begin
  revoke all on table email_notification_preferences, email_deliveries from anon, authenticated;
exception when undefined_object then null;
end $$;

commit;
