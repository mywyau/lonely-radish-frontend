alter table date_proposals drop constraint if exists date_proposals_status_check;
alter table date_proposals add constraint date_proposals_status_check
  check (status in ('draft','pending','accepted','declined','cancelled'));
