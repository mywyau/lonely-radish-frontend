import { badRequest } from './productValidation'

export type AvailabilityWindow = {
  weekday: number
  startTime: string
  endTime: string
}

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const weekdayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const halfHour = 30 * 60 * 1000

function timeMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

function localFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

function localParts(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]))
  return {
    weekday: weekdayNames.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  }
}

function fitsLocalAvailability(
  local: ReturnType<typeof localParts>,
  windows: AvailabilityWindow[],
  durationMinutes: number,
) {
  return windows.some(window => window.weekday === local.weekday
    && local.minutes >= timeMinutes(window.startTime)
    && local.minutes + durationMinutes <= timeMinutes(window.endTime))
}

export function fitsAvailability(
  date: Date,
  windows: AvailabilityWindow[],
  timeZone: string,
  durationMinutes = 60,
) {
  if (!windows.length) return true
  try {
    return fitsLocalAvailability(localParts(date, localFormatter(timeZone)), windows, durationMinutes)
  } catch {
    return false
  }
}

export function sharedAvailabilitySuggestions(options: {
  viewerWindows: AvailabilityWindow[]
  viewerTimeZone: string
  matchWindows: AvailabilityWindow[]
  matchTimeZone: string
  now?: Date
  horizonDays?: number
  limit?: number
  leadMinutes?: number
  durationMinutes?: number
}) {
  const {
    viewerWindows,
    viewerTimeZone,
    matchWindows,
    matchTimeZone,
    now = new Date(),
    horizonDays = 14,
    limit = 3,
    leadMinutes = 60,
    durationMinutes = 60,
  } = options
  if (!viewerWindows.length || !matchWindows.length || limit < 1) return []

  const first = Math.ceil((now.getTime() + leadMinutes * 60 * 1000) / halfHour) * halfHour
  const end = now.getTime() + horizonDays * 24 * 60 * 60 * 1000
  const usedViewerDates = new Set<string>()
  const suggestions: string[] = []
  let viewerFormatter: Intl.DateTimeFormat
  let matchFormatter: Intl.DateTimeFormat
  try {
    viewerFormatter = localFormatter(viewerTimeZone)
    matchFormatter = localFormatter(matchTimeZone)
  } catch {
    return []
  }

  // The scan is deliberately bounded: 14 days at 30-minute intervals is at
  // most 672 constant-time checks, regardless of the number of users.
  for (let timestamp = first; timestamp <= end && suggestions.length < limit; timestamp += halfHour) {
    const candidate = new Date(timestamp)
    const viewerLocal = localParts(candidate, viewerFormatter)
    const matchLocal = localParts(candidate, matchFormatter)
    if (!fitsLocalAvailability(viewerLocal, viewerWindows, durationMinutes)
      || !fitsLocalAvailability(matchLocal, matchWindows, durationMinutes)) continue
    const viewerDate = viewerLocal.dateKey
    if (usedViewerDates.has(viewerDate)) continue
    usedViewerDates.add(viewerDate)
    suggestions.push(candidate.toISOString())
  }
  return suggestions
}

async function ensureUsersFitAvailability(
  queryable: Queryable,
  userIds: string[],
  times: Date[],
  message: string,
) {
  const { rows } = await queryable.query(`select coalesce(bool_and(
    not exists(select 1 from availability configured where configured.user_id=requested.user_id
      and configured.weekday is not null and configured.start_time is not null and configured.end_time is not null)
    or not exists(select 1 from unnest($2::timestamptz[]) as chosen(proposed_at)
      where not exists(select 1 from availability a where a.user_id=requested.user_id
        and a.weekday is not null and a.start_time is not null and a.end_time is not null
        and a.weekday=extract(isodow from (chosen.proposed_at at time zone coalesce(u.timezone,'UTC')))::int-1
        and (chosen.proposed_at at time zone coalesce(u.timezone,'UTC'))::time>=a.start_time
        and a.end_time-(chosen.proposed_at at time zone coalesce(u.timezone,'UTC'))::time>=interval '1 hour'))
  ),true) as "allFit"
  from unnest($1::text[]) as requested(user_id) join users u on u.id=requested.user_id`,
  [[...new Set(userIds)], times.map(time => time.toISOString())])
  if (!rows[0]?.allFit) badRequest(message)
}

export async function ensureTimesFitAvailability(queryable: Queryable, userId: string, times: Date[]) {
  await ensureUsersFitAvailability(queryable, [userId], times,
    'Choose a time within the other person’s usual availability')
}

export async function ensureTimesFitSharedAvailability(queryable: Queryable, userIds: string[], times: Date[]) {
  await ensureUsersFitAvailability(queryable, userIds, times,
    'Choose a time that fits both of your usual schedules')
}
