create table if not exists match_apology_notes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_id text not null references users(id) on delete cascade,
  recipient_id text not null references users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now(),
  unique(match_id,sender_id)
);

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'new_match','proposal_received','proposal_updated','date_confirmed','proposal_declined',
  'follow_up_ready','match_ended','date_follow_up_closed','date_follow_up_changed','match_apology'
));

create index if not exists match_apology_notes_recipient_idx on match_apology_notes(recipient_id,created_at desc);
