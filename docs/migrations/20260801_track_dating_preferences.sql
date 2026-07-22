alter table match_preferences
  add column if not exists dating_preferences_set boolean not null default false;

update match_preferences mp
set dating_preferences_set=true
where mp.open_to_everyone=false or cardinality(mp.interested_genders)>0
  or mp.no_ethnicity_preference=false or cardinality(mp.preferred_ethnicities)>0;
