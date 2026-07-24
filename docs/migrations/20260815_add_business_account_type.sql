begin;

alter table users add column if not exists account_type text not null default 'personal';
alter table users drop constraint if exists users_account_type_check;
alter table users add constraint users_account_type_check check (account_type in ('personal','business'));
update users u set account_type='business'
where exists(select 1 from business_members bm where bm.user_id=u.id);
create index if not exists users_account_type_idx on users(account_type);

commit;
