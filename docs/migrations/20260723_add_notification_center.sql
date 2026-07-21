begin;

alter table notifications add column if not exists proposal_id uuid references date_proposals(id) on delete set null;
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed'
));

create index if not exists notifications_unread_idx
  on notifications(recipient_id,created_at desc) where read_at is null;

commit;
