begin;

-- An ended connection is a boundary. Only the person who ended it may make a
-- new apology-led request; expire any older interest created by the other
-- person under the previous past-contact flow.
update daily_interests di
set resolution='expired',resolved_at=now()
from matches m
where di.resolved_at is null
  and m.status='unmatched'
  and di.created_at>m.ended_at
  and di.sender_id is distinct from m.ended_by
  and ((m.user_one_id=di.sender_id and m.user_two_id=di.recipient_id)
    or (m.user_two_id=di.sender_id and m.user_one_id=di.recipient_id));

commit;
