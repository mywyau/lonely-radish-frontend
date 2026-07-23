// Candidate profile alias: p. Viewing profile alias: viewer. Preference alias: mine.
// Keeping this fragment shared prevents future discovery surfaces from applying different compatibility rules.
export const viewerDiscoveryJoins = `
  join profiles viewer on viewer.user_id=$2
  left join match_preferences mine on mine.user_id=$2`

export const viewerDiscoveryWhere = `
  and extract(year from age(current_date,p.date_of_birth))::int between
    coalesce(mine.minimum_age,18) and coalesce(mine.maximum_age,100)
  and (coalesce(mine.open_to_everyone,true) or case p.gender_identity
    when 'woman' then 'Women' when 'man' then 'Men' when 'neither' then 'Non-binary' end = any(mine.interested_genders)
    or (p.gender_identity='neither' and 'Non-binary people'=any(mine.interested_genders)))
  and (coalesce(mine.no_ethnicity_preference,true) or p.race_ethnicity=any(mine.preferred_ethnicities))
  and (viewer.location is null or (p.location is not null and extensions.ST_DWithin(
    viewer.location,p.location,coalesce(mine.max_distance_km,10)*1000)))`

export const discoveryDistanceSelect = `case when viewer.location is not null and p.location is not null
  then round((extensions.ST_Distance(viewer.location,p.location)/1000)::numeric,1) end as "distanceKm"`
