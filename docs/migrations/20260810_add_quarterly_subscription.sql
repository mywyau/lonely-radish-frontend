begin;

alter table entitlements drop constraint if exists entitlements_plan_check;
alter table entitlements add constraint entitlements_plan_check
  check (plan in ('free','monthly','quarterly','yearly'));

alter table billing_subscriptions drop constraint if exists billing_subscriptions_plan_check;
alter table billing_subscriptions add constraint billing_subscriptions_plan_check
  check (plan in ('monthly','quarterly','yearly'));

commit;
