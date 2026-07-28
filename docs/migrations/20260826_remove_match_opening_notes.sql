begin;

alter table matches
  drop constraint if exists matches_opening_note_check;

alter table matches
  drop column if exists opening_note,
  drop column if exists opening_note_sender_id,
  drop column if exists opening_note_sent_at;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'interest_received','new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed','match_apology','match_contact',
  'date_reminder_24h','date_reminder_2h','date_attendance_confirmed','date_reschedule_requested',
  'date_cancelled','date_outcome_needed','no_show_reported','no_show_disputed','no_show_warning',
  'discovery_restricted','moderation_warning','account_suspended','account_restored'
));

commit;
