begin;

alter table profiles
  add column if not exists sexual_orientation text;
alter table profiles
  drop constraint if exists profiles_sexual_orientation_check;
alter table profiles
  add constraint profiles_sexual_orientation_check check (
    sexual_orientation is null or sexual_orientation in (
      'straight','gay','lesbian','bisexual','pansexual','asexual','queer','questioning','prefer_not_to_say'
    )
  );

alter table match_preferences
  add column if not exists interested_orientations text[] not null default '{}',
  add column if not exists no_orientation_preference boolean not null default true;
alter table match_preferences
  drop constraint if exists match_preferences_interested_orientations_check;
alter table match_preferences
  add constraint match_preferences_interested_orientations_check check (
    cardinality(interested_orientations) <= 9
    and interested_orientations <@ array[
      'straight','gay','lesbian','bisexual','pansexual','asexual','queer','questioning','prefer_not_to_say'
    ]::text[]
  );

commit;
