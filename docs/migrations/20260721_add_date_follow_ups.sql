begin;

create table if not exists date_follow_ups (
  proposal_id uuid not null references date_proposals(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  meet_again boolean not null,
  message text check (message is null or char_length(message) <= 240),
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (proposal_id,user_id)
);

create index if not exists date_follow_ups_user_idx on date_follow_ups(user_id,responded_at desc);
alter table date_follow_ups enable row level security;

do $$ begin
  revoke all on table date_follow_ups from anon, authenticated;
exception when undefined_object then null;
end $$;

commit;
