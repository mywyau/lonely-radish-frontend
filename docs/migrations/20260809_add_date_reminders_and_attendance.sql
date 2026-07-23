begin;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'interest_received','new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed','match_apology',
  'date_reminder_24h','date_reminder_2h','date_attendance_confirmed','date_reschedule_requested','date_cancelled'
));

create table if not exists date_reminders (
  proposal_id uuid not null references date_proposals(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('24h','2h')),
  sent_at timestamptz not null default now(),
  primary key (proposal_id, reminder_type)
);

create table if not exists date_attendance_responses (
  proposal_id uuid not null references date_proposals(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  response text not null check (response in ('confirmed')),
  responded_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create index if not exists date_reminders_sent_idx on date_reminders(sent_at desc);

alter table date_reminders enable row level security;
alter table date_attendance_responses enable row level security;

do $$ begin
  revoke all on table date_reminders, date_attendance_responses from anon, authenticated;
exception when undefined_object then null;
end $$;

commit;
