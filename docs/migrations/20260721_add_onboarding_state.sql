begin;

alter table users add column if not exists onboarding_completed_at timestamptz;

commit;
