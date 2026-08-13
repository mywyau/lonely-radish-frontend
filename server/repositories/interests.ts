import type { DatabaseClient } from '~/server/repositories/db'
import { viewerDiscoveryJoins, viewerDiscoveryWhere } from '~/server/utils/discoveryFilters'
import { expirePendingInterests } from '~/server/utils/interestLifecycle'
import { directProfileVisibilityWhere } from '~/server/utils/profileVisibility'

export interface InterestSender {
  accountStatus: string
  pausedUntil: string | null
  discoveryRestrictedUntil: string | null
}

export interface InterestTarget {
  userId: string
  displayName: string
}

export interface CurrentPairMatch {
  status: 'active' | 'queued'
}

export interface EndedPairMatch {
  id: string
  endedBy: string | null
  endedAt: string
  secondChanceAvailable: boolean
}

export interface ExistingInterest {
  createdAt: string
}

export interface CreatedInterest {
  id: string
  date: string
}

export interface CreatedMatch {
  id: string
}

export class InterestRepository {
  constructor(private readonly client: DatabaseClient) {}

  async lockSender(senderId: string) {
    await this.client.query('select pg_advisory_xact_lock(hashtext($1))', [senderId])
  }

  async getSenderForUpdate(senderId: string) {
    const { rows } = await this.client.query<InterestSender>(`select
        account_status as "accountStatus",paused_until as "pausedUntil",
        discovery_restricted_until as "discoveryRestrictedUntil"
      from users where id=$1 for update`, [senderId])
    return rows[0] ?? null
  }

  async lockPair(senderId: string, recipientId: string) {
    await this.client.query('select pg_advisory_xact_lock(hashtext($1))',
      [[senderId,recipientId].sort().join(':')])
  }

  async findEligibleTarget(profileSlug: string, senderId: string) {
    const { rows } = await this.client.query<InterestTarget>(`select
        p.user_id as "userId",p.display_name as "displayName"
      from profiles p join users u on u.id=p.user_id
      ${viewerDiscoveryJoins}
      where p.slug=$1 and p.user_id<>$2 and p.visibility='active' and
        (u.account_status='active' or
          (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
        and (u.discovery_restricted_until is null or u.discovery_restricted_until<=now())
        and not exists(select 1 from blocks b where
          (b.blocker_id=$2 and b.blocked_id=p.user_id) or
          (b.blocker_id=p.user_id and b.blocked_id=$2))
        ${directProfileVisibilityWhere}
        ${viewerDiscoveryWhere}
      `, [profileSlug,senderId])
    return rows[0] ?? null
  }

  async recipientInboxAcceptingInterests(recipientId: string) {
    await expirePendingInterests(this.client, { recipientId })
    const { rows } = await this.client.query(`select 1 from users u join interest_inbox_state inbox
      on inbox.user_id=u.id where u.id=$1
      and (u.interest_inbox_reopens_at is null or u.interest_inbox_reopens_at<=now())
      and inbox.pending_count<5 for update of inbox`, [recipientId])
    return Boolean(rows[0])
  }

  async findCurrentMatch(senderId: string, recipientId: string) {
    const { rows } = await this.client.query<CurrentPairMatch>(`select status
      from matches where status in ('active','queued') and
        ((user_one_id=$1 and user_two_id=$2) or (user_one_id=$2 and user_two_id=$1))
      limit 1`, [senderId,recipientId])
    return rows[0] ?? null
  }

  async findEndedMatch(senderId: string, recipientId: string) {
    const { rows } = await this.client.query<EndedPairMatch>(`select
        m.id,m.ended_by as "endedBy",m.ended_at as "endedAt",
        exists(select 1 from match_apology_notes man where man.match_id=m.id and man.sender_id=$1
          and man.created_at>m.ended_at and m.ended_by=$1
          and man.message_type='apology') as "secondChanceAvailable"
      from matches m where m.status='unmatched' and
        ((m.user_one_id=$1 and m.user_two_id=$2) or (m.user_one_id=$2 and m.user_two_id=$1))
      limit 1`, [senderId,recipientId])
    return rows[0] ?? null
  }

  async findInterest(senderId: string, recipientId: string) {
    const { rows } = await this.client.query<ExistingInterest>(`select
        created_at as "createdAt" from daily_interests
      where sender_id=$1 and recipient_id=$2
      order by created_at desc limit 1`, [senderId,recipientId])
    return rows[0] ?? null
  }

  async resolvePairInterestsThrough(senderId: string, recipientId: string, endedAt: string) {
    await this.client.query(`update daily_interests set
      resolution='expired',resolved_at=now() where resolved_at is null and
      ((sender_id=$1 and recipient_id=$2) or (sender_id=$2 and recipient_id=$1))
      and created_at<=$3`, [senderId,recipientId,endedAt])
  }

  async countSentToday(senderId: string) {
    const { rows } = await this.client.query<{ count: number }>(`select count(*)::int as count
      from daily_interests di join users u on u.id=di.sender_id
      where di.sender_id=$1 and
        di.sender_day=(now() at time zone coalesce(u.timezone,'UTC'))::date`, [senderId])
    return rows[0]?.count ?? 0
  }

  async createInterest(senderId: string, recipientId: string, inboxBypassed = false) {
    const { rows } = await this.client.query<CreatedInterest>(`insert into daily_interests(
        sender_id,recipient_id,sender_day,inbox_bypassed
      ) select $1,$2,(now() at time zone coalesce(timezone,'UTC'))::date,$3
        from users where id=$1
      returning id,sender_day::text as date`, [senderId,recipientId,inboxBypassed])
    return rows[0]
  }

  async hasReverseInterest(senderId: string, recipientId: string) {
    const { rows } = await this.client.query(`select 1 from daily_interests
      where sender_id=$1 and recipient_id=$2 and resolved_at is null limit 1`,
    [recipientId,senderId])
    return Boolean(rows[0])
  }

  async resolvePairInterestsAccepted(senderId: string, recipientId: string) {
    await this.client.query(`update daily_interests set
      resolution='accepted',resolved_at=now()
      where resolved_at is null and
        ((sender_id=$1 and recipient_id=$2) or (sender_id=$2 and recipient_id=$1))`,
    [senderId,recipientId])
  }

  async upsertQueuedMatch(senderId: string, recipientId: string) {
    const [userOne,userTwo] = [senderId,recipientId].sort()
    const { rows } = await this.client.query<CreatedMatch>(`insert into matches(
        user_one_id,user_two_id,status
      ) values($1,$2,'queued')
      on conflict(user_one_id,user_two_id) do update set
        status='queued',matched_at=now(),ended_by=null,ended_reason=null,ended_at=null,
        action_required_by=null,action_completed_at=null
      returning id`, [userOne,userTwo])
    return rows[0]
  }

  async clearDateProposals(matchId: string) {
    await this.client.query('delete from date_proposals where match_id=$1', [matchId])
  }

}
