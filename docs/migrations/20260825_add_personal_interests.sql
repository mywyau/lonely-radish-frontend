begin;

create table if not exists profile_interests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  position smallint not null check (position between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, position)
);

create unique index if not exists profile_interests_user_label_unique
  on profile_interests(user_id, lower(label));

alter table profile_interests enable row level security;
revoke all on table profile_interests from anon, authenticated;

commit;
