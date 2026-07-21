alter table daily_interests drop constraint if exists daily_interests_sender_id_sender_day_key;

create index if not exists daily_interests_sender_day_idx
  on daily_interests(sender_id, sender_day, created_at desc);
