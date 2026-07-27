begin;

alter table reports add column if not exists reviewed_by text references users(id) on delete set null;

alter table users add column if not exists moderation_suspended_until timestamptz;
alter table users add column if not exists moderation_updated_at timestamptz;
alter table users add column if not exists moderation_updated_by text references users(id) on delete set null;

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete set null,
  target_user_id text not null references users(id) on delete cascade,
  actor_id text references users(id) on delete set null,
  action text not null check (action in (
    'reviewing','dismiss','warning','suspend_7_days','suspend_30_days',
    'suspend_permanent','restore','auto_restore'
  )),
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (note is null or char_length(note) <= 1000)
);

create index if not exists moderation_actions_target_idx
  on moderation_actions(target_user_id,created_at desc);
create index if not exists moderation_actions_report_idx
  on moderation_actions(report_id,created_at desc);
create index if not exists users_moderation_suspension_idx
  on users(moderation_suspended_until) where account_status='suspended';

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'interest_received','new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed','match_apology','match_contact',
  'date_reminder_24h','date_reminder_2h','date_attendance_confirmed','date_reschedule_requested','date_cancelled',
  'date_outcome_needed','no_show_reported','no_show_disputed','no_show_warning','discovery_restricted',
  'moderation_warning','account_suspended','account_restored'
));

alter table moderation_actions enable row level security;
do $$ begin
  revoke all on table moderation_actions from anon,authenticated;
exception when undefined_object then null;
end $$;

commit;
