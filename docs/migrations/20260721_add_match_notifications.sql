begin;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null references users(id) on delete cascade,
  actor_id text references users(id) on delete set null,
  match_id uuid references matches(id) on delete set null,
  kind text not null check (kind in ('match_ended', 'date_follow_up_closed')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on notifications(recipient_id, created_at desc);

alter table notifications enable row level security;
do $$ begin
  revoke all on table notifications from anon, authenticated;
exception when undefined_object then null;
end $$;

commit;
