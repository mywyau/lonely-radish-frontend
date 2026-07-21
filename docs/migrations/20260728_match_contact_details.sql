begin;
create table if not exists profile_contact_details (
  user_id text primary key references users(id) on delete cascade,
  phone_number text check (char_length(phone_number) <= 30),
  contact_email text check (char_length(contact_email) <= 254),
  social_handle text check (char_length(social_handle) <= 100),
  share_with_matches boolean not null default false,
  updated_at timestamptz not null default now()
);
drop trigger if exists profile_contact_details_set_updated_at on profile_contact_details;
create trigger profile_contact_details_set_updated_at before update on profile_contact_details
for each row execute function set_updated_at();
alter table profile_contact_details enable row level security;
do $$ begin
  revoke all on profile_contact_details from anon, authenticated;
exception when undefined_object then null;
end $$;
commit;
