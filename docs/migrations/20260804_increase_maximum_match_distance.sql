alter table match_preferences
  drop constraint if exists match_preferences_max_distance_km_check;

alter table match_preferences
  add constraint match_preferences_max_distance_km_check
  check (max_distance_km between 1 and 500);
