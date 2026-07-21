begin;

create or replace function enforce_five_active_matches() returns trigger language plpgsql as $$
declare
  first_user text := least(new.user_one_id,new.user_two_id);
  second_user text := greatest(new.user_one_id,new.user_two_id);
begin
  if new.status <> 'active' then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended(first_user,0));
  perform pg_advisory_xact_lock(hashtextextended(second_user,0));

  if exists (
    select 1 from (values (new.user_one_id),(new.user_two_id)) as candidate(user_id)
    where (select count(*) from matches m where m.status='active' and m.id<>new.id
      and (m.user_one_id=candidate.user_id or m.user_two_id=candidate.user_id)) >= 5
  ) then
    raise exception using errcode='23514', message='A user cannot have more than five active matches';
  end if;
  return new;
end $$;

drop trigger if exists matches_enforce_five_active on matches;
create trigger matches_enforce_five_active before insert or update of status,user_one_id,user_two_id
  on matches for each row execute function enforce_five_active_matches();

commit;
