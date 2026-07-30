begin;

alter table users
  add column if not exists interest_inbox_reopens_at timestamptz;

alter table daily_interests
  add column if not exists resolution text,
  add column if not exists resolved_at timestamptz,
  add column if not exists inbox_bypassed boolean not null default false;

update daily_interests
set resolution='passed',resolved_at=declined_at
where declined_at is not null and resolved_at is null;

update daily_interests di
set resolution='accepted',resolved_at=coalesce(m.matched_at,now())
from matches m
where di.resolved_at is null
  and m.matched_at>=di.created_at
  and ((m.user_one_id=di.sender_id and m.user_two_id=di.recipient_id)
    or (m.user_two_id=di.sender_id and m.user_one_id=di.recipient_id));

alter table daily_interests
  drop constraint if exists daily_interests_resolution_check;
alter table daily_interests
  add constraint daily_interests_resolution_check check (
    (resolution is null and resolved_at is null)
    or (resolution in ('accepted','passed','expired') and resolved_at is not null)
  );

drop index if exists daily_interests_received_pending_idx;
create index daily_interests_received_pending_idx
  on daily_interests(recipient_id,created_at)
  where resolved_at is null and inbox_bypassed=false;

commit;
