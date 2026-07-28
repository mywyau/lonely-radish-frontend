begin;

alter table profiles
  add column if not exists race_ethnicity_self_description text;

alter table profiles
  drop constraint if exists profiles_race_ethnicity_check;

update profiles
set race_ethnicity = case race_ethnicity
  when 'Black / African / Caribbean' then 'Black'
  when 'Hispanic / Latino' then 'Latin American'
  when 'Native / Indigenous' then 'Indigenous'
  when 'Multiracial / multi-ethnic' then 'Mixed ethnicity'
  else race_ethnicity
end
where race_ethnicity in (
  'Black / African / Caribbean',
  'Hispanic / Latino',
  'Native / Indigenous',
  'Multiracial / multi-ethnic'
);

update match_preferences preferences
set preferred_ethnicities = coalesce((
  select array_agg(distinct mapped.value order by mapped.value)
  from unnest(preferences.preferred_ethnicities) as existing(value)
  cross join lateral unnest(
    case existing.value
      when 'Black / African / Caribbean' then array['Black', 'African', 'Caribbean']
      when 'Hispanic / Latino' then array['Latin American']
      when 'Native / Indigenous' then array['Indigenous']
      when 'Multiracial / multi-ethnic' then array['Mixed ethnicity']
      else array[existing.value]
    end
  ) as mapped(value)
), '{}');

alter table profiles
  add constraint profiles_race_ethnicity_check check (race_ethnicity is null or race_ethnicity in (
    'Asian', 'Black', 'African', 'Caribbean', 'Latin American', 'Middle Eastern', 'North African',
    'White', 'Mixed ethnicity', 'Indigenous', 'Pacific Islander', 'Another ethnic background',
    'Prefer to self-describe', 'Prefer not to say'
  ));

alter table profiles
  drop constraint if exists profiles_race_ethnicity_self_description_check;

alter table profiles
  add constraint profiles_race_ethnicity_self_description_check check (
    race_ethnicity_self_description is null
    or (
      race_ethnicity = 'Prefer to self-describe'
      and char_length(trim(race_ethnicity_self_description)) between 1 and 100
    )
  );

commit;
