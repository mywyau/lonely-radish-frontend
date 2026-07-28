begin;

alter table profiles
  drop constraint if exists profiles_sexual_orientation_check;

alter table match_preferences
  drop constraint if exists match_preferences_interested_orientations_check;

update profiles
set sexual_orientation = 'another_orientation'
where sexual_orientation in (
  'pansexual', 'asexual', 'queer', 'questioning', 'prefer_not_to_say', 'other'
);

update match_preferences preferences
set interested_orientations = coalesce((
  select array_agg(distinct mapped.value order by mapped.value)
  from unnest(preferences.interested_orientations) as existing(value)
  cross join lateral unnest(
    case existing.value
      when 'heterosexual' then array['straight']
      when 'homosexual' then array['gay', 'lesbian']
      when 'other' then array['bisexual', 'another_orientation']
      when 'pansexual' then array['another_orientation']
      when 'asexual' then array['another_orientation']
      when 'queer' then array['another_orientation']
      when 'questioning' then array['another_orientation']
      when 'prefer_not_to_say' then array['another_orientation']
      else array[existing.value]
    end
  ) as mapped(value)
), '{}');

alter table profiles
  add constraint profiles_sexual_orientation_check check (
    sexual_orientation is null or sexual_orientation in (
      'straight', 'gay', 'lesbian', 'bisexual', 'another_orientation'
    )
  );

alter table match_preferences
  add constraint match_preferences_interested_orientations_check check (
    cardinality(interested_orientations) <= 5
    and interested_orientations <@ array[
      'straight', 'gay', 'lesbian', 'bisexual', 'another_orientation'
    ]::text[]
  );

commit;
