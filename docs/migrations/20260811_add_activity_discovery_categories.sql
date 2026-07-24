begin;

alter table profile_activities drop constraint if exists profile_activities_custom_category_valid;
alter table profile_activities add constraint profile_activities_custom_category_valid check (
  (custom_label is null and custom_category is null) or
  (custom_label is not null and custom_category in (
    'Culture','Food and drink','Outdoors','Sports','Gaming','Learning',
    'Wellness','Nightlife','Explore','Community'
  ))
);

insert into activities(category,name) values
  ('Wellness','Yoga'),('Wellness','Saunas'),('Wellness','Meditation'),('Wellness','Spa days'),
  ('Wellness','Wellness classes'),('Wellness','Relaxed movement'),('Wellness','Self-care activities'),
  ('Nightlife','Bars'),('Nightlife','Cocktails'),('Nightlife','Live DJs'),('Nightlife','Dancing'),
  ('Nightlife','Late-night food'),('Nightlife','Pub quizzes'),('Nightlife','Evening events'),
  ('Explore','Day trips'),('Explore','Sightseeing'),('Explore','Hidden spots'),
  ('Explore','Neighbourhood wandering'),('Explore','Road trips'),('Explore','Trying somewhere new'),
  ('Community','Volunteering'),('Community','Community events'),('Community','Charity activities'),
  ('Community','Environmental projects'),('Community','Meetups'),('Community','Local causes')
on conflict do nothing;

commit;
