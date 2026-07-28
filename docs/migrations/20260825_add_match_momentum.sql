begin;

alter table matches
  add column if not exists action_required_by text references users(id) on delete cascade,
  add column if not exists action_completed_at timestamptz,
  add column if not exists opening_note text,
  add column if not exists opening_note_sender_id text references users(id) on delete set null,
  add column if not exists opening_note_sent_at timestamptz;

alter table daily_interests
  add column if not exists declined_at timestamptz;

create index if not exists daily_interests_received_pending_idx
  on daily_interests(recipient_id,created_at desc)
  where declined_at is null;

alter table matches
  drop constraint if exists matches_action_required_member_check;
alter table matches
  add constraint matches_action_required_member_check check (
    action_required_by is null
    or action_required_by=user_one_id
    or action_required_by=user_two_id
  );

alter table matches
  drop constraint if exists matches_opening_note_check;
alter table matches
  add constraint matches_opening_note_check check (
    (opening_note is null and opening_note_sender_id is null and opening_note_sent_at is null)
    or (
      opening_note is not null
      and char_length(trim(opening_note)) between 1 and 240
      and opening_note_sender_id is not null
      and opening_note_sent_at is not null
    )
  );

create index if not exists matches_pending_action_idx
  on matches(action_required_by)
  where status='active' and action_required_by is not null and action_completed_at is null;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'interest_received','new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed','match_apology','match_contact',
  'match_opening_note','date_reminder_24h','date_reminder_2h','date_attendance_confirmed',
  'date_reschedule_requested','date_cancelled','date_outcome_needed','no_show_reported','no_show_disputed',
  'no_show_warning','discovery_restricted','moderation_warning','account_suspended','account_restored'
));

commit;
