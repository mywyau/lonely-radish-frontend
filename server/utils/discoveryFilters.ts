// Candidate profile alias: p. Viewing profile alias: viewer. Preference aliases: mine and theirs.
// Keeping this fragment shared prevents future discovery surfaces from applying different compatibility rules.
export const viewerDiscoveryJoins = `
  join profiles viewer on viewer.user_id=$2
  left join match_preferences mine on mine.user_id=$2
  left join match_preferences theirs on theirs.user_id=p.user_id`

export const viewerDiscoveryWhere = `
  and p.date_of_birth<=(current_date-(coalesce(mine.minimum_age,18)*interval '1 year'))::date
  and p.date_of_birth>(current_date-((coalesce(mine.maximum_age,100)+1)*interval '1 year'))::date
  and viewer.date_of_birth<=(current_date-(coalesce(theirs.minimum_age,18)*interval '1 year'))::date
  and viewer.date_of_birth>(current_date-((coalesce(theirs.maximum_age,100)+1)*interval '1 year'))::date
  and (coalesce(mine.open_to_everyone,true) or case p.gender_identity
    when 'woman' then 'Women' when 'man' then 'Men' when 'neither' then 'Non-binary' end = any(mine.interested_genders)
    or (p.gender_identity='neither' and 'Non-binary people'=any(mine.interested_genders)))
  and (coalesce(mine.no_orientation_preference,true) or p.sexual_orientation=any(mine.interested_orientations))
  and (coalesce(theirs.open_to_everyone,true) or case viewer.gender_identity
    when 'woman' then 'Women' when 'man' then 'Men' when 'neither' then 'Non-binary' end = any(theirs.interested_genders))
  and (coalesce(theirs.no_orientation_preference,true) or viewer.sexual_orientation=any(theirs.interested_orientations))
  and (coalesce(mine.no_ethnicity_preference,true) or p.race_ethnicity=any(mine.preferred_ethnicities))
  and (viewer.location is null or (p.location is not null and extensions.ST_DWithin(
    viewer.location,p.location,coalesce(mine.max_distance_km,10)*1000)))
  and (p.location is null or (viewer.location is not null and extensions.ST_DWithin(
    p.location,viewer.location,coalesce(theirs.max_distance_km,10)*1000)))`

// Incoming interests queue continuously. Members review the oldest five at a time.
export const recipientInterestAvailabilitySelect = `true as "acceptingInterest"`

export const discoveryDistanceSelect = `case when viewer.location is not null and p.location is not null
  then round((extensions.ST_Distance(viewer.location,p.location)/1000)::numeric,1) end as "distanceKm"`
