create table if not exists users (
  id text primary key,
  email text not null,
  created_at timestamptz not null default now(),
  stripe_customer_id text,
  deleting_at timestamptz
);

alter table users
  add column if not exists first_name text,
  add column if not exists last_name text;
