begin;

-- Older deletion flows could mark an account as deleting without leaving a
-- retryable job. Backfill a failed job so an administrator can safely retry
-- the existing idempotent worker instead of manually editing account state.
insert into account_deletion_jobs(
  user_id,status,attempt_count,requested_by,request_source,request_reason,last_error,created_at
)
select u.id,'failed',0,u.id,'self','Recovery of stranded self-deletion',
  'Deletion request had no retryable worker job',now()
from users u
where u.account_status='deleting'
  and u.deletion_status in ('pending','processing','failed')
  and not exists (
    select 1 from account_deletion_jobs job
    where job.user_id=u.id
      and job.created_at>=coalesce(u.deletion_requested_at,u.deleting_at,'epoch'::timestamptz)
      and job.status in ('pending','processing','failed','completed')
  );

commit;
