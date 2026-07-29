begin;

alter table profile_photos
  add column if not exists thumbnail_storage_key text;

alter table profile_photos
  drop constraint if exists profile_photos_thumbnail_storage_key_check;
alter table profile_photos
  add constraint profile_photos_thumbnail_storage_key_check check (
    thumbnail_storage_key is null
    or char_length(thumbnail_storage_key) <= 500
  );

commit;
