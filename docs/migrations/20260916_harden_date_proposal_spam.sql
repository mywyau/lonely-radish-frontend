begin;

-- Reconcile legacy duplicates before enforcing the invariant. Keep the proposal
-- that was most recently changed and cancel the rest.
with ranked_pending as (
  select id,
    row_number() over (
      partition by match_id
      order by updated_at desc, created_at desc, id desc
    ) as position
  from date_proposals
  where status='pending'
), cancelled_pending as (
  update date_proposals proposal
  set status='cancelled', selected_time_id=null, confirmed_at=null
  from ranked_pending ranked
  where proposal.id=ranked.id and ranked.position>1
  returning proposal.id
)
delete from notifications notification
using cancelled_pending cancelled
where notification.proposal_id=cancelled.id
  and notification.kind in ('proposal_received','date_reschedule_requested','proposal_updated');

create unique index if not exists date_proposals_one_pending_per_match_idx
  on date_proposals(match_id)
  where status='pending';

-- Keep one notification for each proposal action. Updating an existing row does
-- not fire the email-on-insert trigger, so retries cannot fan out extra email.
with ranked_notifications as (
  select id,
    row_number() over (
      partition by recipient_id, proposal_id, kind
      order by created_at desc, id desc
    ) as position
  from notifications
  where proposal_id is not null
    and kind in ('proposal_received','date_reschedule_requested','proposal_updated')
)
delete from notifications notification
using ranked_notifications ranked
where notification.id=ranked.id and ranked.position>1;

create unique index if not exists notifications_proposal_action_once_idx
  on notifications(recipient_id,proposal_id,kind)
  where proposal_id is not null
    and kind in ('proposal_received','date_reschedule_requested','proposal_updated');

commit;
