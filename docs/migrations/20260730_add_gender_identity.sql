alter table profiles
  add column if not exists gender_identity text;

alter table profiles
  drop constraint if exists profiles_gender_identity_check;

alter table profiles
  add constraint profiles_gender_identity_check
  check (gender_identity is null or gender_identity in ('man', 'woman', 'neither'));
