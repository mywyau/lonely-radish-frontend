begin;

alter table availability add column if not exists weekday smallint check (weekday between 0 and 6);
alter table availability add column if not exists start_time time;
alter table availability add column if not exists end_time time;

alter table availability drop constraint if exists availability_time_window_valid;
alter table availability add constraint availability_time_window_valid check (
  (weekday is null and start_time is null and end_time is null)
  or (weekday is not null and start_time is not null and end_time is not null and start_time < end_time)
);

create unique index if not exists availability_user_weekday_unique
  on availability(user_id,weekday) where weekday is not null;

commit;
