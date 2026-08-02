begin;

create table if not exists interest_inbox_state (
  user_id text primary key references users(id) on delete cascade,
  pending_count integer not null default 0 check (pending_count >= 0),
  updated_at timestamptz not null default now()
);

insert into interest_inbox_state(user_id,pending_count)
select u.id,count(di.id)::int
from users u left join daily_interests di on di.recipient_id=u.id
  and di.resolved_at is null and di.inbox_bypassed=false
group by u.id
on conflict(user_id) do update set pending_count=excluded.pending_count,updated_at=now();

create or replace function create_interest_inbox_state()
returns trigger
language plpgsql
as $$
begin
  insert into interest_inbox_state(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists users_create_interest_inbox_state on users;
create trigger users_create_interest_inbox_state
after insert on users for each row execute function create_interest_inbox_state();

create or replace function maintain_pending_interest_count()
returns trigger
language plpgsql
as $$
declare
  old_uses_capacity boolean;
  new_uses_capacity boolean;
begin
  if tg_op='DELETE' then
    if old.resolved_at is null and old.inbox_bypassed=false then
      update interest_inbox_state set pending_count=greatest(pending_count-1,0),updated_at=now()
      where user_id=old.recipient_id;
    end if;
    return old;
  end if;

  if tg_op='INSERT' then
    if new.resolved_at is null and new.inbox_bypassed=false then
      update interest_inbox_state set pending_count=pending_count+1,updated_at=now()
      where user_id=new.recipient_id and pending_count<5;
      if not found then
        raise exception 'Recipient interest inbox is full'
          using errcode='23514',constraint='interest_inbox_capacity';
      end if;
    end if;
    return new;
  end if;

  old_uses_capacity := old.resolved_at is null and old.inbox_bypassed=false;
  new_uses_capacity := new.resolved_at is null and new.inbox_bypassed=false;
  if old_uses_capacity and (not new_uses_capacity
      or old.recipient_id is distinct from new.recipient_id) then
    update interest_inbox_state set pending_count=greatest(pending_count-1,0),updated_at=now()
    where user_id=old.recipient_id;
  end if;

  if new_uses_capacity and (not old_uses_capacity
      or old.recipient_id is distinct from new.recipient_id) then
    update interest_inbox_state set pending_count=pending_count+1,updated_at=now()
    where user_id=new.recipient_id and pending_count<5;
    if not found then
      raise exception 'Recipient interest inbox is full'
        using errcode='23514',constraint='interest_inbox_capacity';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists daily_interests_maintain_pending_count on daily_interests;
create trigger daily_interests_maintain_pending_count
after insert or delete or update of recipient_id,resolved_at,inbox_bypassed
on daily_interests for each row execute function maintain_pending_interest_count();

create or replace function reconcile_pending_interest_counts(target_user_id text default null)
returns integer
language plpgsql
as $$
declare
  changed integer;
begin
  with actual as (
    select u.id,count(di.id)::int as pending_count
    from users u left join daily_interests di on di.recipient_id=u.id
      and di.resolved_at is null and di.inbox_bypassed=false
    where target_user_id is null or u.id=target_user_id
    group by u.id
  ), repaired as (
    insert into interest_inbox_state(user_id,pending_count,updated_at)
    select id,pending_count,now() from actual
    on conflict(user_id) do update set pending_count=excluded.pending_count,updated_at=now()
    where interest_inbox_state.pending_count is distinct from excluded.pending_count
    returning 1
  )
  select count(*)::int into changed from repaired;
  return changed;
end;
$$;

revoke execute on function reconcile_pending_interest_counts(text) from public;

create index if not exists profiles_discovery_birth_date_idx
  on profiles(date_of_birth,updated_at desc,slug desc)
  where visibility='active';

commit;
