begin;

create table if not exists api_idempotency (
  user_id text not null references users(id) on delete cascade,
  operation text not null check (char_length(operation) between 1 and 80),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 100),
  request_fingerprint text not null check (char_length(request_fingerprint) between 1 and 200),
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, operation, idempotency_key)
);

create index if not exists api_idempotency_created_idx
  on api_idempotency(created_at);

commit;
