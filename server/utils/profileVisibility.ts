/**
 * Candidate aliases: users `u`, profiles `p`; viewer parameter: `$2`.
 *
 * Incognito members appear in discovery only to someone they currently chose.
 * Keeping this inside PostgreSQL preserves cursor pagination and prevents a
 * hidden candidate from reaching application memory or API responses.
 */
export const candidateDiscoveryVisibilityWhere = `
  and (
    coalesce(u.discovery_mode,'standard')='standard'
    or exists(select 1 from daily_interests visibility_interest
      where visibility_interest.sender_id=p.user_id
        and visibility_interest.recipient_id=$2
        and visibility_interest.resolved_at is null)
  )`

/**
 * Direct profile access is broader than discovery so recipients retain safety
 * actions and evidence after an interest expires or is withdrawn. A current or
 * past match also keeps profile access. Endpoint-level block checks still win.
 */
export const directProfileVisibilityWhere = `
  and (
    coalesce(u.discovery_mode,'standard')='standard'
    or exists(select 1 from daily_interests visibility_interest
      where visibility_interest.sender_id=p.user_id
        and visibility_interest.recipient_id=$2)
    or exists(select 1 from matches visibility_match where
      (visibility_match.user_one_id=$2 and visibility_match.user_two_id=p.user_id)
      or (visibility_match.user_two_id=$2 and visibility_match.user_one_id=p.user_id))
  )`
