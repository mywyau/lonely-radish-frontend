begin;

alter table account_deletion_jobs add column if not exists requested_by text references users(id) on delete set null;
alter table account_deletion_jobs add column if not exists request_source text not null default 'self';
alter table account_deletion_jobs add column if not exists request_reason text;
alter table account_deletion_jobs add column if not exists report_id uuid references reports(id) on delete set null;

alter table account_deletion_jobs drop constraint if exists account_deletion_jobs_request_source_check;
alter table account_deletion_jobs add constraint account_deletion_jobs_request_source_check
  check (request_source in ('self','admin'));
alter table account_deletion_jobs drop constraint if exists account_deletion_jobs_request_reason_check;
alter table account_deletion_jobs add constraint account_deletion_jobs_request_reason_check
  check (request_reason is null or char_length(request_reason) <= 1000);

create index if not exists account_deletion_jobs_requested_by_idx
  on account_deletion_jobs(requested_by,created_at desc);

commit;
