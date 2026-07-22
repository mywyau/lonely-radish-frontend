alter table profiles
  add column if not exists race_ethnicity text;

alter table profiles
  drop constraint if exists profiles_race_ethnicity_check;

alter table profiles
  add constraint profiles_race_ethnicity_check check (race_ethnicity is null or race_ethnicity in (
    'Asian', 'Black / African / Caribbean', 'Hispanic / Latino', 'Middle Eastern', 'North African',
    'Native / Indigenous', 'Pacific Islander', 'White', 'Multiracial / multi-ethnic', 'Prefer not to say'
  ));
