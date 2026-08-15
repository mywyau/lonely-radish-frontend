begin;

alter table businesses drop constraint if exists businesses_status_check;
alter table businesses add constraint businesses_status_check
  check (status in ('draft','pending','active','paused','suspended'));

alter table admin_review_events drop constraint if exists admin_review_events_decision_check;
alter table admin_review_events add constraint admin_review_events_decision_check
  check (decision in ('pending','approved','rejected','paused','restored'));

commit;
