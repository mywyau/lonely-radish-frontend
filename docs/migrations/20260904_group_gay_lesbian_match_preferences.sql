begin;

update match_preferences
set interested_orientations = array(
  select distinct orientation
  from unnest(interested_orientations || array['gay', 'lesbian']::text[]) as selected(orientation)
  order by orientation
)
where interested_orientations && array['gay', 'lesbian']::text[];

commit;
