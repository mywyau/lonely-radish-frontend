begin;

alter table date_proposals
  add column if not exists replaces_proposal_id uuid references date_proposals(id) on delete set null;

create unique index if not exists date_proposals_active_replacement_idx
  on date_proposals(replaces_proposal_id)
  where replaces_proposal_id is not null and status in ('draft','pending');

create index if not exists date_proposals_replaces_idx
  on date_proposals(replaces_proposal_id, created_at desc)
  where replaces_proposal_id is not null;

commit;
