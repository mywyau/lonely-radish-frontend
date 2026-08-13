begin;

-- Keep completed interests as quota and moderation history while allowing a
-- later connection lifecycle to create one new pending interest for the pair.
alter table daily_interests
  drop constraint if exists daily_interests_sender_recipient_unique;

drop index if exists daily_interests_sender_recipient_unique;
create unique index daily_interests_sender_recipient_unique
  on daily_interests(sender_id,recipient_id)
  where resolved_at is null;

commit;
