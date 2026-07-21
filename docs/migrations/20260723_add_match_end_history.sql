begin;

alter table matches add column if not exists ended_by text references users(id) on delete set null;
alter table matches add column if not exists ended_reason text check (ended_reason in ('removed','post_date'));
alter table matches add column if not exists ended_at timestamptz;

update matches m set ended_by=n.actor_id,ended_reason='removed',ended_at=n.created_at
from notifications n where n.match_id=m.id and n.kind='match_ended' and m.status='unmatched'
  and m.ended_at is null;

update matches m set ended_reason='post_date',ended_at=outcome.ended_at
from (
  select dp.match_id,max(df.responded_at) as ended_at
  from date_proposals dp join date_follow_ups df on df.proposal_id=dp.id
  group by dp.match_id having count(*)=2 and not bool_and(df.meet_again)
) outcome where m.id=outcome.match_id and m.status='unmatched' and m.ended_at is null;

create index if not exists matches_ended_history_idx on matches(ended_at desc) where status='unmatched';

commit;
