begin;

-- Keep an efficient pending count, but allow more interests to queue than the
-- five shown to a member at once. Pending interests still expire after 14 days.
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
      where user_id=new.recipient_id;
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
    where user_id=new.recipient_id;
  end if;
  return new;
end;
$$;

commit;
