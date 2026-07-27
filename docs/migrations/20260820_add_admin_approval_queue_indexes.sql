begin;

create index if not exists businesses_approval_queue_idx
  on businesses(status,created_at desc,id);
create index if not exists business_venues_approval_queue_idx
  on business_venues(status,created_at desc,id);
create index if not exists business_offers_approval_queue_idx
  on business_offers(approval_status,created_at desc,id);

commit;
