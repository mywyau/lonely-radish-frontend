begin;

alter table users add column if not exists confirmed_no_show_count integer not null default 0 check (confirmed_no_show_count >= 0);
alter table users add column if not exists discovery_restricted_until timestamptz;
alter table date_reminders drop constraint if exists date_reminders_reminder_type_check;
alter table date_reminders add constraint date_reminders_reminder_type_check
  check (reminder_type in ('24h','2h','outcome'));

create table if not exists date_outcome_responses (
  proposal_id uuid not null references date_proposals(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  outcome text not null check (outcome in ('happened','cancelled','no_show')),
  note text,
  responded_at timestamptz not null default now(),
  primary key (proposal_id,user_id),
  check (note is null or char_length(note) <= 240)
);

create table if not exists date_no_show_cases (
  id bigserial primary key,
  proposal_id uuid not null references date_proposals(id) on delete cascade,
  reporter_id text not null references users(id) on delete cascade,
  accused_user_id text not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','confirmed','disputed','dismissed')),
  response_deadline timestamptz not null default (now()+interval '48 hours'),
  response_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(proposal_id,accused_user_id),
  check (reporter_id<>accused_user_id),
  check (response_note is null or char_length(response_note) <= 240)
);

create index if not exists date_no_show_cases_pending_idx
  on date_no_show_cases(response_deadline) where status='pending';
create index if not exists users_discovery_restricted_idx
  on users(discovery_restricted_until) where discovery_restricted_until is not null;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'interest_received','new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed','match_apology',
  'date_reminder_24h','date_reminder_2h','date_attendance_confirmed','date_reschedule_requested','date_cancelled',
  'date_outcome_needed','no_show_reported','no_show_disputed','no_show_warning','discovery_restricted'
));

alter table date_outcome_responses enable row level security;
alter table date_no_show_cases enable row level security;

do $$ begin
  revoke all on table date_outcome_responses, date_no_show_cases from anon, authenticated;
exception when undefined_object then null;
end $$;

commit;
