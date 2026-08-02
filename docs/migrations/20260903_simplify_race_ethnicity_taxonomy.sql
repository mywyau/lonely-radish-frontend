begin;

alter table profiles
  drop constraint if exists profiles_race_ethnicity_check;

alter table profiles
  drop constraint if exists profiles_race_ethnicity_self_description_check;

update profiles
set race_ethnicity = case race_ethnicity
  when 'Black / African / Caribbean' then 'Black'
  when 'African' then 'Black'
  when 'Caribbean' then 'Black'
  when 'Hispanic / Latino' then 'Latin American'
  when 'Middle Eastern' then 'Middle Eastern or North African'
  when 'North African' then 'Middle Eastern or North African'
  when 'Multiracial / multi-ethnic' then 'Mixed or multiple backgrounds'
  when 'Mixed ethnicity' then 'Mixed or multiple backgrounds'
  when 'Native / Indigenous' then 'Indigenous'
  when 'Pacific Islander' then 'Another racial or ethnic background'
  when 'Another ethnic background' then 'Another racial or ethnic background'
  when 'Prefer to self-describe' then 'Another racial or ethnic background'
  else race_ethnicity
end;

update match_preferences preferences
set preferred_ethnicities = coalesce((
  select array_agg(distinct mapped.value order by mapped.value)
  from unnest(preferences.preferred_ethnicities) as existing(value)
  cross join lateral unnest(
    case existing.value
      when 'Black / African / Caribbean' then array['Black']
      when 'African' then array['Black']
      when 'Caribbean' then array['Black']
      when 'Hispanic / Latino' then array['Latin American']
      when 'Middle Eastern' then array['Middle Eastern or North African']
      when 'North African' then array['Middle Eastern or North African']
      when 'Multiracial / multi-ethnic' then array['Mixed or multiple backgrounds']
      when 'Mixed ethnicity' then array['Mixed or multiple backgrounds']
      when 'Native / Indigenous' then array['Indigenous']
      when 'Pacific Islander' then array['Another racial or ethnic background']
      when 'Another ethnic background' then array['Another racial or ethnic background']
      when 'Prefer to self-describe' then array['Another racial or ethnic background']
      else array[existing.value]
    end
  ) as mapped(value)
), '{}');

alter table profiles
  add constraint profiles_race_ethnicity_check check (race_ethnicity is null or race_ethnicity in (
    'Asian',
    'Black',
    'Latin American',
    'Middle Eastern or North African',
    'White',
    'Mixed or multiple backgrounds',
    'Indigenous',
    'Another racial or ethnic background',
    'Prefer not to say'
  ));

alter table profiles
  add constraint profiles_race_ethnicity_self_description_check check (
    race_ethnicity_self_description is null
    or (
      race_ethnicity = 'Another racial or ethnic background'
      and char_length(trim(race_ethnicity_self_description)) between 1 and 100
    )
  );

commit;
