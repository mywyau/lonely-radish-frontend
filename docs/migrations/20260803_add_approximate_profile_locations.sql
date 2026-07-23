create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

alter table profiles
  add column if not exists postcode_area text,
  add column if not exists location_label text,
  add column if not exists location extensions.geography(point, 4326);

update profiles
set location = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
where location is null and latitude is not null and longitude is not null;

alter table profiles
  drop constraint if exists profiles_postcode_area_length,
  add constraint profiles_postcode_area_length check (postcode_area is null or char_length(postcode_area) <= 8),
  drop constraint if exists profiles_location_label_length,
  add constraint profiles_location_label_length check (location_label is null or char_length(location_label) <= 100);

create index if not exists profiles_location_gist_idx on profiles using gist(location);
