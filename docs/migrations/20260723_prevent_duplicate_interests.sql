begin;

delete from daily_interests duplicate
using daily_interests kept
where duplicate.sender_id=kept.sender_id and duplicate.recipient_id=kept.recipient_id
  and (duplicate.created_at,duplicate.id)>(kept.created_at,kept.id);

alter table daily_interests drop constraint if exists daily_interests_sender_recipient_unique;
alter table daily_interests add constraint daily_interests_sender_recipient_unique unique(sender_id,recipient_id);

commit;
