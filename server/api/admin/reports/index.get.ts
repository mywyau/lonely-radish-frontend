import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'
import { badRequest, text } from '~/server/utils/productValidation'

const statuses = new Set(['active', 'open', 'reviewing', 'resolved', 'dismissed', 'all'])
const categories = new Set(['all', 'spam', 'harassment', 'safety', 'impersonation', 'other'])

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const status = text(query.status, 'Report status', 20) || 'active'
  const category = text(query.category, 'Report category', 30) || 'all'
  const priorityValue = text(query.priority, 'Priority', 10) || 'all'
  const search = text(query.q, 'Search', 80)
  if (!statuses.has(status)) badRequest('Choose a valid report status')
  if (!categories.has(category)) badRequest('Choose a valid report category')
  if (priorityValue !== 'all' && !['1', '2', '3', '4', '5'].includes(priorityValue)) badRequest('Choose a valid report priority')
  const cursor = decodeCursor(query.cursor)
  if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor.tieBreaker)) badRequest('Invalid pagination cursor')
  const pageSize = 25
  const databaseStatus = status === 'active' ? ['open', 'reviewing'] : status === 'all' ? null : [status]

  const [reportsResult, countsResult] = await Promise.all([
    db.query(`select r.id,r.category,r.details,r.status,r.priority,
      r.created_at as "createdAt",r.reviewed_at as "reviewedAt",r.resolution,
      r.related_match_id as "relatedMatchId",reviewer.email as "reviewedBy",
      r.related_interest_id as "relatedInterestId",
      related_interest.created_at as "relatedInterestCreatedAt",
      related_interest.resolution as "relatedInterestResolution",
      related_interest.resolved_at as "relatedInterestResolvedAt",
      related_match.status as "relatedMatchStatus",related_match.ended_reason as "relatedMatchEndedReason",
      related_match.ended_at as "relatedMatchEndedAt",
      (select count(*)::int from date_proposals dp where dp.match_id=r.related_match_id) as "relatedDateCount",
      reporter.id as "reporterId",reporter.email as "reporterEmail",
      reporter_profile.display_name as "reporterName",reporter_profile.slug as "reporterSlug",
      reported.id as "reportedId",reported.email as "reportedEmail",
      reported.role as "reportedRole",reported.account_status as "reportedAccountStatus",
      reported.moderation_suspended_until as "suspendedUntil",
      reported_profile.display_name as "reportedName",reported_profile.slug as "reportedSlug",
      exists(select 1 from blocks bl where bl.blocker_id=r.reporter_id and bl.blocked_id=r.reported_id) as "reporterBlockedUser",
      (select count(*)::int from reports previous where previous.reported_id=r.reported_id and previous.id<>r.id) as "previousReportCount",
      (select count(*)::int from reports submitted where submitted.reporter_id=r.reporter_id and submitted.id<>r.id) as "reporterSubmissionCount",
      coalesce((select json_agg(history order by history."createdAt" desc) from (
        select previous.id,previous.category,previous.status,previous.priority,previous.created_at as "createdAt"
        from reports previous where previous.reported_id=r.reported_id and previous.id<>r.id
        order by previous.created_at desc limit 5
      ) history),'[]'::json) as "recentReports",
      latest.action as "latestAction",latest.note as "latestActionNote",
      latest.expires_at as "latestActionExpiresAt"
      from reports r
      join users reporter on reporter.id=r.reporter_id
      join users reported on reported.id=r.reported_id
      left join profiles reporter_profile on reporter_profile.user_id=reporter.id
      left join profiles reported_profile on reported_profile.user_id=reported.id
      left join matches related_match on related_match.id=r.related_match_id
      left join daily_interests related_interest on related_interest.id=r.related_interest_id
      left join users reviewer on reviewer.id=r.reviewed_by
      left join lateral (
        select ma.action,ma.note,ma.expires_at from moderation_actions ma
        where ma.report_id=r.id order by ma.created_at desc limit 1
      ) latest on true
      where ($1::text[] is null or r.status=any($1))
        and ($2::text is null or r.category=$2)
        and ($3::smallint is null or r.priority=$3)
        and ($4::text is null or concat_ws(' ',r.details,reporter.email,reporter_profile.display_name,
          reporter_profile.slug,reported.email,reported_profile.display_name,reported_profile.slug) ilike '%'||$4||'%')
        and ($5::timestamptz is null or (r.created_at,r.id::text)<($5,$6::text))
      order by r.created_at desc,r.id::text desc limit $7`, [
      databaseStatus,
      category === 'all' ? null : category,
      priorityValue === 'all' ? null : Number(priorityValue),
      search,
      cursor?.sortAt || null,
      cursor?.tieBreaker || null,
      pageSize + 1,
    ]),
    db.query(`select
      count(*) filter(where status in ('open','reviewing'))::int as active,
      count(*) filter(where status='open')::int as open,
      count(*) filter(where status='reviewing')::int as reviewing,
      count(*) filter(where status='resolved')::int as resolved,
      count(*) filter(where status='dismissed')::int as dismissed
      from reports`),
  ])

  const page = pageRows(reportsResult.rows, pageSize, row => ({
    sortAt: new Date(row.createdAt).toISOString(),
    tieBreaker: row.id,
  }))
  return {
    reports: page.items,
    counts: countsResult.rows[0],
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  }
})
