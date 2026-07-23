alter table email_deliveries
  add column if not exists locked_at timestamptz;

create index if not exists email_deliveries_processing_lease_idx
  on email_deliveries(locked_at)
  where status='processing';
