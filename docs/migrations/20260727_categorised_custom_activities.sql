begin;

alter table profile_activities add column if not exists custom_category text;
update profile_activities set custom_category='Food and drink'
  where custom_label is not null and custom_category is null;
alter table profile_activities drop constraint if exists profile_activities_custom_category_valid;
alter table profile_activities add constraint profile_activities_custom_category_valid check (
  (custom_label is null and custom_category is null) or
  (custom_label is not null and custom_category in ('Culture','Food and drink','Outdoors','Sports','Gaming','Learning'))
);

commit;
