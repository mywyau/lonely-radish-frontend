begin;

alter table date_follow_ups
  add column if not exists reconsidered_at timestamptz;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('match_ended', 'date_follow_up_closed', 'date_follow_up_changed'));

commit;
