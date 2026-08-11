begin;

alter table daily_interests
  drop constraint if exists daily_interests_resolution_check;
alter table daily_interests
  add constraint daily_interests_resolution_check check (
    (resolution is null and resolved_at is null)
    or (resolution in ('accepted','passed','expired','withdrawn') and resolved_at is not null)
  );

create index if not exists daily_interests_pending_expiry_idx
  on daily_interests(created_at)
  where resolved_at is null;

with expired as (
  update daily_interests
  set resolution='expired',resolved_at=now()
  where resolved_at is null and created_at<=now()-interval '14 days'
  returning sender_id,recipient_id
)
delete from notifications n using expired e
where n.kind='interest_received' and n.recipient_id=e.recipient_id
  and n.actor_id=e.sender_id;

commit;
