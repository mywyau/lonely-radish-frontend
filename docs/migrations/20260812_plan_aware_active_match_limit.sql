begin;

create or replace function enforce_active_match_limit() returns trigger language plpgsql as $$
declare
  first_user text := least(new.user_one_id,new.user_two_id);
  second_user text := greatest(new.user_one_id,new.user_two_id);
begin
  if new.status <> 'active' then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended(first_user,0));
  perform pg_advisory_xact_lock(hashtextextended(second_user,0));

  if exists (
    select 1
    from (values (new.user_one_id),(new.user_two_id)) as candidate(user_id)
    where (
      select count(*) from matches m
      where m.status='active' and m.id<>new.id
        and (m.user_one_id=candidate.user_id or m.user_two_id=candidate.user_id)
    ) >= coalesce((
      select case
        when e.plan in ('monthly','quarterly','yearly')
          and e.subscription_status in ('active','trialing','past_due') then 5
        else 3
      end
      from entitlements e where e.user_id=candidate.user_id
    ),3)
  ) then
    raise exception using errcode='23514', message='An account has reached its active match limit';
  end if;
  return new;
end $$;

drop trigger if exists matches_enforce_five_active on matches;
drop trigger if exists matches_enforce_active_limit on matches;
create trigger matches_enforce_active_limit before insert or update of status,user_one_id,user_two_id
  on matches for each row execute function enforce_active_match_limit();

drop function if exists enforce_five_active_matches();

commit;
