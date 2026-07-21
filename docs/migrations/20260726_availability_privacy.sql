begin;

alter table match_preferences add column if not exists availability_visible_before_match boolean not null default false;

commit;
