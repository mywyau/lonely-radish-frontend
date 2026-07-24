begin;

alter table profiles add column if not exists height_cm smallint;
alter table profiles add column if not exists drinking text;
alter table profiles add column if not exists smoking text;
alter table profiles add column if not exists daily_rhythm text;

alter table profiles drop constraint if exists profiles_height_cm_check;
alter table profiles add constraint profiles_height_cm_check
  check (height_cm is null or height_cm between 120 and 230);

alter table profiles drop constraint if exists profiles_drinking_check;
alter table profiles add constraint profiles_drinking_check
  check (drinking is null or drinking in ('never','socially','regularly','prefer_not_to_say'));

alter table profiles drop constraint if exists profiles_smoking_check;
alter table profiles add constraint profiles_smoking_check
  check (smoking is null or smoking in ('never','socially','regularly','prefer_not_to_say'));

alter table profiles drop constraint if exists profiles_daily_rhythm_check;
alter table profiles add constraint profiles_daily_rhythm_check
  check (daily_rhythm is null or daily_rhythm in ('early_bird','night_owl','flexible'));

commit;
