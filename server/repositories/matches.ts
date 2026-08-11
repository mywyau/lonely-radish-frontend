import type { DatabaseClient } from '~/server/repositories/db'

export interface IncomingInterest {
  senderId: string
  slug: string
  displayName: string
}

export interface PairMatch {
  id: string
  status: 'active' | 'queued' | 'unmatched' | 'blocked'
}

export interface MatchIdentity {
  id: string
}

export class MatchRepository {
  constructor(private readonly client: DatabaseClient) {}

  async lockRecipientMomentum(recipientId: string) {
    await this.client.query('select pg_advisory_xact_lock(hashtext($1))',
      [`match-momentum:${recipientId}`])
  }

  async hasPendingManualMatch(recipientId: string) {
    const { rows } = await this.client.query(`select 1 from matches
      where status='active' and action_required_by=$1 and action_completed_at is null
      limit 1`, [recipientId])
    return Boolean(rows[0])
  }

  async findIncomingInterestForUpdate(interestId: string, recipientId: string) {
    const { rows } = await this.client.query<IncomingInterest>(`select
        di.sender_id as "senderId",p.slug,p.display_name as "displayName"
      from daily_interests di
      join profiles p on p.user_id=di.sender_id
      join users u on u.id=di.sender_id
      where di.id=$1 and di.recipient_id=$2 and di.resolved_at is null
        and p.visibility='active' and (u.account_status='active' or
          (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
        and not exists(select 1 from matches ended where ended.status='unmatched'
          and ((ended.user_one_id=$2 and ended.user_two_id=di.sender_id) or
            (ended.user_two_id=$2 and ended.user_one_id=di.sender_id))
          and (di.sender_id is distinct from ended.ended_by or di.created_at<=ended.ended_at or not exists(
            select 1 from match_apology_notes man
            where man.match_id=ended.id and man.sender_id=di.sender_id
              and man.created_at>ended.ended_at and di.sender_id=ended.ended_by
              and man.message_type='apology')))
      for update`, [interestId,recipientId])
    return rows[0] ?? null
  }

  async lockPair(userOne: string, userTwo: string) {
    await this.client.query('select pg_advisory_xact_lock(hashtext($1))',
      [[userOne,userTwo].sort().join(':')])
  }

  async isBlocked(userOne: string, userTwo: string) {
    const { rows } = await this.client.query(`select 1 from blocks where
      (blocker_id=$1 and blocked_id=$2) or (blocker_id=$2 and blocked_id=$1)
      limit 1`, [userOne,userTwo])
    return Boolean(rows[0])
  }

  async findPairMatch(userOne: string, userTwo: string) {
    const pair = [userOne,userTwo].sort()
    const { rows } = await this.client.query<PairMatch>(`select id,status from matches
      where user_one_id=$1 and user_two_id=$2`, pair)
    return rows[0] ?? null
  }

  async createOrResetQueuedMatch(
    userOne: string,
    userTwo: string,
    actionRequiredBy: string,
    existingMatchId?: string,
  ) {
    if (existingMatchId) {
      const { rows } = await this.client.query<MatchIdentity>(`update matches set
          status='queued',matched_at=now(),ended_by=null,ended_reason=null,ended_at=null,
          action_required_by=$2,action_completed_at=null
        where id=$1 returning id`, [existingMatchId,actionRequiredBy])
      return rows[0]
    }

    const pair = [userOne,userTwo].sort()
    const { rows } = await this.client.query<MatchIdentity>(`insert into matches(
        user_one_id,user_two_id,status,action_required_by
      ) values($1,$2,'queued',$3) returning id`, [...pair,actionRequiredBy])
    return rows[0]
  }

  async clearDateProposals(matchId: string) {
    await this.client.query('delete from date_proposals where match_id=$1', [matchId])
  }

  async resolveAcceptedInterest(interestId: string, recipientId: string) {
    const { rows } = await this.client.query<{ inboxReopensAt: string }>(`with resolved as (
        update daily_interests set resolution='accepted',resolved_at=now()
        where id=$1 and recipient_id=$2 and resolved_at is null returning recipient_id
      )
      update users u set interest_inbox_reopens_at=greatest(
        coalesce(u.interest_inbox_reopens_at,'-infinity'::timestamptz),
        ((date_trunc('day',now() at time zone coalesce(u.timezone,'UTC'))+interval '1 day')
          at time zone coalesce(u.timezone,'UTC')))
      from resolved where u.id=resolved.recipient_id
      returning u.interest_inbox_reopens_at as "inboxReopensAt"`, [interestId,recipientId])
    return rows[0]?.inboxReopensAt ?? null
  }

}
